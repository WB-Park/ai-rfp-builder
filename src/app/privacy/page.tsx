export default function PrivacyPage() {
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
      color: '#1e293b', lineHeight: 1.8, fontSize: 15,
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>개인정보처리방침</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 40 }}>시행일: 2026년 4월 21일 | 주식회사 위시켓</p>

      <Section title="1. 개인정보의 수집 항목 및 수집 방법">
        <p><strong>수집 항목:</strong> 이름, 이메일 주소, 연락처(전화번호)</p>
        <p><strong>수집 방법:</strong> AI PRD 빌더 서비스 이용 과정에서 이용자가 직접 입력</p>
      </Section>

      <Section title="2. 개인정보의 수집 및 이용 목적">
        <p>회사는 수집한 개인정보를 다음의 목적으로 이용합니다:</p>
        <ul>
          <li>AI PRD 빌더를 통해 생성된 프로젝트 정의서 기반 맞춤 제안서 발송</li>
          <li>프로젝트 견적 상담 및 전문가 매칭 안내</li>
          <li>서비스 이용 관련 공지사항 전달</li>
          <li>서비스 개선을 위한 통계 분석 (비식별 처리)</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용 기간">
        <p>회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관련 법령에 의하여 보존할 필요가 있는 경우 아래와 같이 보관합니다:</p>
        <ul>
          <li><strong>계약 또는 청약 철회에 관한 기록:</strong> 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
          <li><strong>대금 결제 및 재화 등의 공급에 관한 기록:</strong> 5년</li>
          <li><strong>소비자의 불만 또는 분쟁 처리에 관한 기록:</strong> 3년</li>
        </ul>
        <p>위 법정 보관 기간이 경과한 후에는 지체 없이 파기합니다.</p>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다:</p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
        </ul>
        <p>프로젝트 상담 매칭 시, 이용자의 동의를 받은 범위 내에서 위시켓 등록 파트너사에게 프로젝트 정보(프로젝트명, 요구사항 요약)가 제공될 수 있습니다. 이때 이용자의 개인 연락처는 위시켓 플랫폼을 통해서만 전달됩니다.</p>
      </Section>

      <Section title="5. 개인정보의 파기 절차 및 방법">
        <p><strong>파기 절차:</strong> 이용 목적이 달성된 개인정보는 별도의 DB로 옮겨져 내부 방침 및 관련 법령에 따라 일정 기간 저장된 후 파기됩니다.</p>
        <p><strong>파기 방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</p>
      </Section>

      <Section title="6. 이용자의 권리와 행사 방법">
        <p>이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다. 요청은 아래 연락처로 문의해 주시면 지체 없이 조치하겠습니다.</p>
      </Section>

      <Section title="7. 개인정보 보호를 위한 기술적·관리적 대책">
        <ul>
          <li><strong>암호화:</strong> 개인정보는 암호화되어 저장 및 관리되며, 전송 시 SSL/TLS를 통해 보호됩니다.</li>
          <li><strong>접근 제한:</strong> 개인정보에 대한 접근 권한을 최소한의 인원으로 제한합니다.</li>
          <li><strong>정기 점검:</strong> 개인정보 처리 시스템에 대한 정기적인 자체 감사를 실시합니다.</li>
        </ul>
      </Section>

      <Section title="8. 개인정보 보호책임자">
        <p><strong>회사명:</strong> 주식회사 위시켓</p>
        <p><strong>이메일:</strong> privacy@wishket.com</p>
        <p>기타 개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다:</p>
        <ul>
          <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
          <li>대검찰청 사이버수사과 (spo.go.kr / 1301)</li>
          <li>경찰청 사이버안전국 (cyberbureau.police.go.kr / 182)</li>
        </ul>
      </Section>

      <Section title="9. 개인정보처리방침의 변경">
        <p>이 개인정보처리방침은 2026년 4월 21일부터 적용됩니다. 변경 사항이 있을 경우 시행 7일 전부터 서비스 내 공지를 통해 안내하겠습니다.</p>
      </Section>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e2e8f0', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
        &copy; 2026 주식회사 위시켓. All rights reserved.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>{title}</h2>
      <div style={{ color: '#475569', lineHeight: 1.8 }}>{children}</div>
    </section>
  );
}
