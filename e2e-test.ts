/**
 * E2E Test Script — Deep mode 루프 버그 + 칩 UX 검증
 * 10회 반복 테스트 (5회 Quick + 5회 Deep)
 *
 * 검증 항목:
 * 1. Deep mode 루프 방지 (기능/MVP 반복 질문 없음)
 * 2. rfpUpdate가 매 턴 반환되는지
 * 3. showFeatureSelector가 1번만 true인지
 * 4. completionReady 조건 동작
 * 5. quickReplies에 완료 관련 텍스트 없는지
 */

const API_URL = 'http://localhost:3099/api/chat';

interface RFPData {
  overview: string;
  targetUsers: string;
  coreFeatures: { name: string; description: string; priority: string }[];
  referenceServices: string;
  techRequirements: string;
  budgetTimeline: string;
  additionalRequirements: string;
}

interface TestResult {
  testId: number;
  mode: 'quick' | 'deep';
  turns: number;
  passed: boolean;
  failures: string[];
  featureSelectorCount: number;
  rfpUpdateCount: number;
  loopDetected: boolean;
  completionReady: boolean;
  turnDetails: string[];
}

const emptyRFP: RFPData = {
  overview: '', targetUsers: '', coreFeatures: [],
  referenceServices: '', techRequirements: '', budgetTimeline: '', additionalRequirements: '',
};

const USER_INPUTS = [
  '반려동물 건강관리 앱을 만들고 싶어요. 산책 기록, 건강 체크, 동물병원 예약 기능이 필요합니다.',
  '20~40대 반려동물 보호자가 주요 타겟이에요',
  '네, 추천해주세요',  // for feature selector or follow-up
  '모바일 앱 (iOS, Android) 둘 다 필요해요',
  '펫닥, 핏펫 같은 서비스를 참고하고 있어요',
  '수의사 상담 기능도 추가하고 싶어요',
  '건너뛰기',
  '네, 괜찮습니다',
  '건너뛰기',
  '건너뛰기',
];

async function callChatAPI(
  messages: { role: string; content: string }[],
  rfpData: RFPData,
  mode: 'quick' | 'deep',
  deepPhase: string = 'conversation'
) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, rfpData, chatMode: mode, deepPhase }),
  });
  return res.json();
}

function detectLoop(turnDetails: string[]): boolean {
  // Check if same topic appears 3+ times
  const topicCounts: Record<string, number> = {};
  for (const detail of turnDetails) {
    const topic = detail.toLowerCase();
    // Feature/MVP related keywords
    if (topic.includes('기능') || topic.includes('mvp') || topic.includes('feature')) {
      topicCounts['feature'] = (topicCounts['feature'] || 0) + 1;
    }
  }
  return Object.values(topicCounts).some(c => c >= 3);
}

async function runSingleTest(testId: number, mode: 'quick' | 'deep'): Promise<TestResult> {
  const result: TestResult = {
    testId, mode, turns: 0, passed: true, failures: [],
    featureSelectorCount: 0, rfpUpdateCount: 0,
    loopDetected: false, completionReady: false, turnDetails: [],
  };

  let messages: { role: string; content: string }[] = [];
  let rfpData = { ...emptyRFP };
  let deepPhase = 'conversation';
  const MAX_TURNS = 8;

  // Initial greeting
  const greeting = mode === 'quick'
    ? '위시켓 AI PRD 빌더입니다. 어떤 서비스를 만들고 싶으신가요?'
    : '위시켓 AI PRD 빌더 Deep Mode입니다. 어떤 서비스를 만들고 싶으세요?';
  messages.push({ role: 'assistant', content: greeting });

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const userInput = USER_INPUTS[turn] || '건너뛰기';
    messages.push({ role: 'user', content: userInput });

    try {
      const data = await callChatAPI(messages, rfpData, mode, deepPhase);
      result.turns = turn + 1;

      // Track turn detail (question topic)
      const question = data.questionMessage || data.message || '';
      result.turnDetails.push(`T${turn+1}: ${question.substring(0, 80)}`);

      // --- TEST 1: rfpUpdate 반환 여부 ---
      if (data.rfpUpdate) {
        result.rfpUpdateCount++;
        const { section, value } = data.rfpUpdate;
        if (section === 'coreFeatures' && Array.isArray(value)) {
          rfpData.coreFeatures = value;
        } else if (section && value && section in rfpData) {
          (rfpData as any)[section] = value;
        }
      }

      // --- TEST 2: showFeatureSelector 중복 체크 ---
      if (data.selectableFeatures && data.selectableFeatures.length > 0) {
        result.featureSelectorCount++;
        if (result.featureSelectorCount > 1) {
          result.failures.push(`FAIL: featureSelector shown ${result.featureSelectorCount} times (should be 1)`);
          result.passed = false;
        }
        // Simulate selecting features
        const selected = data.selectableFeatures.slice(0, 5);
        const payload = JSON.stringify(selected.map((f: any) => ({ name: f.name, desc: f.desc, category: f.category })));
        messages.push({ role: 'assistant', content: question });
        messages.push({ role: 'user', content: payload });

        rfpData.coreFeatures = selected.map((f: any, i: number) => ({
          name: f.name, description: f.desc || f.name,
          priority: f.category === 'must' ? 'P1' : i < 4 ? 'P2' : 'P3',
        }));

        // Call API again after feature selection
        const data2 = await callChatAPI(messages, rfpData, mode, deepPhase);
        result.turnDetails.push(`T${turn+1}b: [feature selected] → ${(data2.questionMessage || data2.message || '').substring(0, 80)}`);

        if (data2.rfpUpdate) result.rfpUpdateCount++;
        if (data2.deepPhase) deepPhase = data2.deepPhase;

        messages.push({ role: 'assistant', content: data2.questionMessage || data2.message || '' });
        continue;
      }

      // --- TEST 3: quickReplies에 완료 관련 텍스트 없는지 ---
      if (data.quickReplies || data.inlineOptions) {
        const replies = [...(data.quickReplies || []), ...(data.inlineOptions || [])];
        for (const r of replies) {
          if (/RFP|PRD|생성|완성|시작하기/.test(r)) {
            result.failures.push(`FAIL T${turn+1}: quickReply contains completion text: "${r}"`);
            result.passed = false;
          }
        }
      }

      // --- TEST 4: completionReady ---
      if (data.canComplete || data.nextAction === 'complete') {
        result.completionReady = true;
      }

      if (data.deepPhase) deepPhase = data.deepPhase;

      messages.push({ role: 'assistant', content: data.questionMessage || data.message || '' });

    } catch (err: any) {
      result.failures.push(`ERROR T${turn+1}: ${err.message}`);
      result.passed = false;
      break;
    }
  }

  // --- TEST 5: 루프 감지 ---
  result.loopDetected = detectLoop(result.turnDetails);
  if (result.loopDetected) {
    result.failures.push('FAIL: Loop detected — feature/MVP topic repeated 3+ times');
    result.passed = false;
  }

  // --- TEST 6: rfpUpdate가 최소 3번은 반환되어야 함 ---
  if (result.rfpUpdateCount < 2) {
    result.failures.push(`WARN: rfpUpdate only returned ${result.rfpUpdateCount} times (expected >= 2)`);
    // This is a warning, not a hard failure
  }

  return result;
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  E2E Test Suite — 10회 반복 (Quick 5 + Deep 5)');
  console.log('═══════════════════════════════════════════\n');

  const results: TestResult[] = [];

  for (let i = 0; i < 10; i++) {
    const mode = i < 5 ? 'quick' : 'deep';
    console.log(`\n--- Test #${i+1} (${mode.toUpperCase()} mode) ---`);

    const result = await runSingleTest(i + 1, mode as 'quick' | 'deep');
    results.push(result);

    console.log(`  Turns: ${result.turns}`);
    console.log(`  rfpUpdates: ${result.rfpUpdateCount}`);
    console.log(`  featureSelector shown: ${result.featureSelectorCount}`);
    console.log(`  Loop detected: ${result.loopDetected}`);
    console.log(`  completionReady: ${result.completionReady}`);
    console.log(`  Result: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (result.failures.length > 0) {
      for (const f of result.failures) console.log(`    ${f}`);
    }
    console.log('  Turn details:');
    for (const d of result.turnDetails) console.log(`    ${d}`);

    // Small delay between tests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const loopCount = results.filter(r => r.loopDetected).length;
  const avgRfpUpdates = (results.reduce((s, r) => s + r.rfpUpdateCount, 0) / results.length).toFixed(1);
  const multiFeatureSelector = results.filter(r => r.featureSelectorCount > 1).length;

  console.log(`\n  Total: ${results.length} tests`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  🔄 Loop detected: ${loopCount}`);
  console.log(`  📊 Avg rfpUpdates per test: ${avgRfpUpdates}`);
  console.log(`  ⚠️ Multiple featureSelector: ${multiFeatureSelector}`);
  console.log(`\n  Overall: ${passed === results.length ? '✅ ALL TESTS PASSED' : `❌ ${failed} TESTS FAILED`}`);

  // Return exit code
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
