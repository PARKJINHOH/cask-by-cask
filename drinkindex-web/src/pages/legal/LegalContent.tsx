// ── Shared legal content components ────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="font-semibold text-neutral-900 mb-2">{title}</h3>
      <div className="space-y-1.5 text-neutral-700">{children}</div>
    </div>
  )
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`leading-relaxed${className ? ` ${className}` : ''}`}>{children}</p>
}

function Ol({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-1">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ol>
  )
}

// ── Terms of Service ────────────────────────────────────────
export function TermsContent() {
  return (
    <article className="text-sm">
      <p className="text-xs text-neutral-500 mb-4">시행일: 2026년 6월 1일</p>

      <Section title="제1조 (목적)">
        <P>
          이 약관은 DrinkIndex(이하 "서비스")를 이용함에 있어 서비스 제공자와 이용자의 권리·의무 및
          책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </P>
      </Section>

      <Section title="제2조 (용어의 정의)">
        <Ol items={[
          '"서비스"란 위스키·와인·꼬냑 정보 및 리뷰를 제공하는 드링크인덱스 플랫폼을 말합니다.',
          '"회원"이란 서비스에 회원가입을 하여 서비스를 이용하는 자를 말합니다.',
          '"콘텐츠"란 회원이 서비스에 게시한 리뷰, 댓글, 게시물 등 일체를 말합니다.',
        ]} />
      </Section>

      <Section title="제3조 (약관의 게시 및 효력)">
        <Ol items={[
          '본 약관은 회원가입 시 동의를 받아 효력이 발생합니다.',
          '서비스 제공자는 약관을 개정할 경우 적용일자 및 개정 사유를 명시하여 7일 전에 서비스 내 공지사항을 통해 고지합니다.',
        ]} />
      </Section>

      <Section title="제4조 (서비스 이용 자격)">
        <Ol items={[
          '본 서비스는 주류 관련 서비스로, 만 19세 이상만 이용 가능합니다.',
          '타인의 정보를 도용하여 회원가입한 경우 즉시 이용이 제한됩니다.',
          '하나의 이메일 주소로 하나의 계정만 생성할 수 있습니다.',
        ]} />
      </Section>

      <Section title="제5조 (서비스의 제공)">
        <Ol items={[
          '서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.',
          '정기점검, 시스템 장애, 기타 운영상의 이유로 서비스가 일시적으로 중단될 수 있으며, 이 경우 사전 공지를 원칙으로 합니다.',
        ]} />
      </Section>

      <Section title="제6조 (회원의 의무)">
        <P>회원은 다음 행위를 하여서는 안 됩니다.</P>
        <Ol items={[
          '타인의 개인정보를 무단으로 수집하거나 사용하는 행위',
          '타인을 비방, 모욕하거나 명예를 손상시키는 콘텐츠를 게시하는 행위',
          '허위 사실을 유포하거나 광고성 콘텐츠를 게시하는 행위',
          '저작권 등 타인의 지식재산권을 침해하는 행위',
          '미성년자에게 주류를 권장하거나 조장하는 콘텐츠를 게시하는 행위',
          '서비스의 정상적인 운영을 방해하는 행위',
          '기타 관련 법령에 위반되는 행위',
        ]} />
      </Section>

      <Section title="제7조 (콘텐츠의 저작권)">
        <Ol items={[
          '회원이 작성한 콘텐츠의 저작권은 해당 회원에게 귀속됩니다.',
          '서비스는 플랫폼 운영 및 서비스 홍보를 위해 회원이 작성한 콘텐츠를 무상으로 전시·활용할 수 있습니다.',
          '운영 규정에 위반되는 콘텐츠는 사전 통보 없이 삭제될 수 있습니다.',
        ]} />
      </Section>

      <Section title="제8조 (서비스 이용 제한 및 탈퇴)">
        <Ol items={[
          '서비스 제공자는 본 약관을 위반한 회원에 대해 이용을 제한하거나 계정을 해지할 수 있습니다.',
          '회원은 마이페이지에서 언제든지 서비스를 탈퇴할 수 있습니다.',
          '탈퇴 후 회원 정보는 관련 법령이 정한 기간 동안 보관 후 파기됩니다.',
        ]} />
      </Section>

      <Section title="제9조 (면책 조항)">
        <Ol items={[
          '서비스 제공자는 천재지변, 불가항력으로 인한 서비스 중단에 대하여 책임을 지지 않습니다.',
          '회원이 게시한 콘텐츠의 정확성·신뢰성에 대한 책임은 해당 회원에게 있습니다.',
          '서비스 제공자는 무료로 제공하는 서비스 이용에 관련하여 발생한 손해에 대해 책임을 지지 않습니다.',
        ]} />
      </Section>

      <Section title="제10조 (분쟁 해결)">
        <Ol items={[
          '본 약관은 대한민국 법률에 따라 해석됩니다.',
          '서비스 이용으로 발생한 분쟁의 관할 법원은 민사소송법에 따른 관할 법원으로 합니다.',
        ]} />
      </Section>

      <p className="text-xs text-neutral-400 mt-4">부칙: 이 약관은 2026년 6월 1일부터 시행합니다.</p>
    </article>
  )
}

// ── Privacy Policy ──────────────────────────────────────────
export function PrivacyContent() {
  return (
    <article className="text-sm">
      <p className="text-xs text-neutral-500 mb-1">시행일: 2026년 6월 1일</p>
      <p className="text-neutral-700 mb-4 leading-relaxed">
        DrinkIndex(이하 "서비스")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고
        이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
      </p>

      <Section title="제1조 (개인정보의 처리 목적)">
        <P>서비스는 다음의 목적을 위하여 개인정보를 처리합니다.</P>
        <Ol items={[
          '회원가입 및 관리: 회원 자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지',
          '서비스 제공: 위스키·와인·꼬냑 정보 제공, 리뷰 서비스, 커뮤니티 서비스',
        ]} />
      </Section>

      <Section title="제2조 (처리하는 개인정보 항목)">
        <P>서비스는 다음의 개인정보 항목을 처리합니다.</P>
        <Ol items={[
          '필수항목: 이메일 주소, 비밀번호(암호화 저장), 닉네임, 이용약관 및 개인정보 처리방침 동의 일시',
          '자동수집: 서비스 이용 기록, 접속 로그, IP 주소',
        ]} />
      </Section>

      <Section title="제3조 (개인정보의 처리 및 보유 기간)">
        <Ol items={[
          '회원 정보: 회원 탈퇴 시까지 보유',
          '전자상거래 관련 기록: 5년 (전자상거래 등에서의 소비자 보호에 관한 법률)',
          '소비자 불만 또는 분쟁 처리 기록: 3년 (전자상거래 등에서의 소비자 보호에 관한 법률)',
          '접속에 관한 기록: 3개월 (통신비밀보호법)',
        ]} />
      </Section>

      <Section title="제4조 (개인정보의 제3자 제공)">
        <P>
          서비스는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며,
          정보주체의 동의 또는 법률의 특별한 규정이 있는 경우에만 제3자에게 제공합니다.
        </P>
      </Section>

      <Section title="제5조 (개인정보 처리의 위탁)">
        <P>서비스는 현재 개인정보 처리 업무를 외부에 위탁하지 않습니다.</P>
      </Section>

      <Section title="제6조 (개인정보의 파기)">
        <Ol items={[
          '파기절차: 개인정보 보유기간 경과, 처리목적 달성 시 지체 없이 파기합니다.',
          '파기방법: 전자적 형태의 경우 복구 불가능한 기술적 방법으로 영구 삭제합니다.',
        ]} />
      </Section>

      <Section title="제7조 (정보주체의 권리·의무 및 행사방법)">
        <P>정보주체는 서비스에 대해 언제든지 다음 권리를 행사할 수 있습니다.</P>
        <Ol items={[
          '개인정보 열람 요구',
          '오류 등이 있을 경우 정정 요구',
          '삭제 요구',
          '처리 정지 요구',
        ]} />
        <P className="mt-2">
          위 권리 행사는 마이페이지 또는 이메일(drinkindex.cs@gmail.com)로 요청하실 수 있습니다.
        </P>
      </Section>

      <Section title="제8조 (개인정보의 안전성 확보조치)">
        <Ol items={[
          '비밀번호 암호화: 사용자 비밀번호는 BCrypt 알고리즘으로 암호화하여 저장합니다.',
          '통신 암호화: HTTPS를 적용하여 네트워크상 개인정보를 암호화합니다.',
          '접근 제한: 개인정보 처리 담당자를 최소화하고 접근 권한을 관리합니다.',
          '접속 기록 보관: 개인정보 처리 시스템에 대한 접속 기록을 보관합니다.',
        ]} />
      </Section>

      <Section title="제9조 (개인정보 보호책임자)">
        <P>서비스는 개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자를 지정합니다.</P>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          <li>이메일: drinkindex.cs@gmail.com</li>
        </ul>
        <P className="mt-1.5">
          정보주체는 서비스를 이용하면서 발생한 모든 개인정보 보호 관련 문의, 불만, 피해구제 등에
          관한 사항을 위 연락처로 문의하실 수 있습니다.
        </P>
      </Section>

      <Section title="제10조 (처리방침 변경)">
        <P>
          이 개인정보 처리방침은 시행일로부터 적용되며, 내용의 추가·삭제 및 정정이 있을 시에는
          변경 사유 및 내용을 시행 7일 전 서비스 공지사항을 통해 고지합니다.
        </P>
      </Section>

      <p className="text-xs text-neutral-400 mt-4">시행일: 2026년 6월 1일</p>
    </article>
  )
}
