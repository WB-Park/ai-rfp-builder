/**
 * E2E Test — 10회 반복 (Quick 5 + Deep 5)
 */

const API_URL = 'http://localhost:3099/api/chat';

const emptyRFP = {
  overview: '', targetUsers: '', coreFeatures: [],
  referenceServices: '', techRequirements: '', budgetTimeline: '', additionalRequirements: '',
};

const USER_INPUTS = [
  '반려동물 건강관리 앱을 만들고 싶어요. 산책 기록, 건강 체크, 동물병원 예약 기능이 필요합니다.',
  '20~40대 반려동물 보호자가 주요 타겟이에요',
  '네, 추천해주세요',
  '모바일 앱 (iOS, Android) 둘 다 필요해요',
  '펫닥, 핏펫 같은 서비스를 참고하고 있어요',
  '수의사 상담 기능도 추가하고 싶어요',
  '건너뛰기',
  '네, 괜찮습니다',
  '건너뛰기',
  '건너뛰기',
];

function detectLoop(turnDetails) {
  let featureCount = 0;
  for (const detail of turnDetails) {
    const t = detail.toLowerCase();
    if (t.includes('기능') || t.includes('mvp') || t.includes('feature') || t.includes('핵심')) {
      featureCount++;
    }
  }
  return featureCount >= 3;
}

async function callChatAPI(messages, rfpData, mode, deepPhase = 'conversation', featureSelectorShown = false) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, rfpData, chatMode: mode, deepPhase, featureSelectorShown }),
  });
  return res.json();
}

async function runSingleTest(testId, mode) {
  const result = {
    testId, mode, turns: 0, passed: true, failures: [],
    featureSelectorCount: 0, rfpUpdateCount: 0,
    loopDetected: false, completionReady: false, turnDetails: [],
  };

  let messages = [];
  let rfpData = { ...emptyRFP, coreFeatures: [] };
  let deepPhase = 'conversation';
  let featureSelectorShown = false;  // ★ 루프 방지 플래그
  const MAX_TURNS = 8;

  const greeting = mode === 'quick'
    ? '위시켓 AI PRD 빌더입니다. 어떤 서비스를 만들고 싶으신가요?'
    : '위시켓 AI PRD 빌더 Deep Mode입니다. 어떤 서비스를 만들고 싶으세요?';
  messages.push({ role: 'assistant', content: greeting });

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const userInput = USER_INPUTS[turn] || '건너뛰기';
    messages.push({ role: 'user', content: userInput });

    try {
      const data = await callChatAPI(messages, rfpData, mode, deepPhase, featureSelectorShown);
      result.turns = turn + 1;

      const question = data.questionMessage || data.message || '';
      result.turnDetails.push(`T${turn+1}: ${question.substring(0, 100)}`);

      // TEST 1: rfpUpdate
      if (data.rfpUpdate) {
        result.rfpUpdateCount++;
        const { section, value } = data.rfpUpdate;
        if (section === 'coreFeatures' && Array.isArray(value)) {
          rfpData.coreFeatures = value;
        } else if (section && value && section in rfpData) {
          rfpData[section] = value;
        }
      }

      // TEST 2: featureSelector 중복
      if (data.selectableFeatures && data.selectableFeatures.length > 0) {
        result.featureSelectorCount++;
        featureSelectorShown = true;  // ★ 영구 플래그 설정
        if (result.featureSelectorCount > 1) {
          result.failures.push(`FAIL: featureSelector shown ${result.featureSelectorCount}x`);
          result.passed = false;
        }
        // Simulate selection
        const selected = data.selectableFeatures.slice(0, 5);
        const payload = JSON.stringify(selected.map(f => ({ name: f.name, desc: f.desc, category: f.category })));
        messages.push({ role: 'assistant', content: question });
        messages.push({ role: 'user', content: payload });
        rfpData.coreFeatures = selected.map((f, i) => ({
          name: f.name, description: f.desc || f.name,
          priority: f.category === 'must' ? 'P1' : i < 4 ? 'P2' : 'P3',
        }));

        const data2 = await callChatAPI(messages, rfpData, mode, deepPhase, featureSelectorShown);
        result.turnDetails.push(`T${turn+1}b: [feat selected] → ${(data2.questionMessage || data2.message || '').substring(0, 100)}`);
        if (data2.rfpUpdate) result.rfpUpdateCount++;
        if (data2.deepPhase) deepPhase = data2.deepPhase;
        messages.push({ role: 'assistant', content: data2.questionMessage || data2.message || '' });
        continue;
      }
      // ★ 서버에서 featureSelectorShown을 보내주면 클라이언트도 반영
      if (data.featureSelectorShown) {
        featureSelectorShown = true;
      }

      // TEST 3: quickReplies에 완료 텍스트 없는지
      const replies = [...(data.quickReplies || []), ...(data.inlineOptions || [])];
      for (const r of replies) {
        if (/RFP|PRD|생성|완성|시작하기/.test(r)) {
          result.failures.push(`FAIL T${turn+1}: quickReply has completion text: "${r}"`);
          result.passed = false;
        }
      }

      // TEST 4: completionReady
      if (data.canComplete || data.nextAction === 'complete') {
        result.completionReady = true;
      }

      if (data.deepPhase) deepPhase = data.deepPhase;
      messages.push({ role: 'assistant', content: data.questionMessage || data.message || '' });

    } catch (err) {
      result.failures.push(`ERROR T${turn+1}: ${err.message}`);
      result.passed = false;
      break;
    }
  }

  // TEST 5: 루프 감지
  result.loopDetected = detectLoop(result.turnDetails);
  if (result.loopDetected) {
    result.failures.push('FAIL: Loop detected — feature/MVP topic repeated 3+ times');
    result.passed = false;
  }

  // TEST 6: rfpUpdate 최소 횟수
  if (result.rfpUpdateCount < 2) {
    result.failures.push(`WARN: rfpUpdate only ${result.rfpUpdateCount}x (expected >= 2)`);
  }

  return result;
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  E2E Test Suite — 10회 반복');
  console.log('═══════════════════════════════════════════\n');

  const results = [];

  for (let i = 0; i < 10; i++) {
    const mode = i < 5 ? 'quick' : 'deep';
    console.log(`\n--- Test #${i+1} (${mode.toUpperCase()}) ---`);

    const result = await runSingleTest(i + 1, mode);
    results.push(result);

    console.log(`  Turns: ${result.turns} | rfpUpdates: ${result.rfpUpdateCount} | featSelector: ${result.featureSelectorCount}`);
    console.log(`  Loop: ${result.loopDetected} | completionReady: ${result.completionReady}`);
    console.log(`  Result: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (result.failures.length > 0) {
      for (const f of result.failures) console.log(`    ${f}`);
    }
    for (const d of result.turnDetails) console.log(`    ${d}`);

    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const loopCount = results.filter(r => r.loopDetected).length;
  const avgRfpUpdates = (results.reduce((s, r) => s + r.rfpUpdateCount, 0) / results.length).toFixed(1);
  const multiFS = results.filter(r => r.featureSelectorCount > 1).length;

  console.log(`  Total: ${results.length}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  🔄 Loop detected: ${loopCount}`);
  console.log(`  📊 Avg rfpUpdates: ${avgRfpUpdates}`);
  console.log(`  ⚠️ Multi featureSelector: ${multiFS}`);
  console.log(`  Overall: ${passed === results.length ? '✅ ALL PASSED' : `❌ ${failed} FAILED`}`);

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
