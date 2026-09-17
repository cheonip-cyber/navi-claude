import { useState } from 'react'
import sourceData from '../../03_교육네비게이터_실습데이터.json'
import './App.css'

const employees = sourceData.employees
const nextLevelByCurrentLevel = {
  LV4: 'LV3',
  LV3: 'LV2',
  LV2: 'LV1',
  LV1: '특급 엔지니어',
}

function App() {
  const [employeeId, setEmployeeId] = useState('')
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const normalizedId = employeeId.trim().toUpperCase()

    if (!normalizedId) {
      setResult(null)
      setMessage('사번을 입력해 주세요.')
      return
    }

    const employee = employees.find(({ employee_id }) => employee_id === normalizedId)
    if (!employee) {
      setResult(null)
      setMessage('입력한 사번의 직원 정보를 찾을 수 없습니다.')
      return
    }

    setResult(employee)
    setMessage('')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="교육 네비게이터 홈"><span className="brand-mark" aria-hidden="true">N</span><span>교육 네비게이터</span></a>
        <span className="stage-label">STEP 01 · 직원 정보 조회</span>
      </header>
      <section className="hero" id="top" aria-labelledby="page-title">
        <p className="eyebrow">MY LEARNING PATH</p>
        <h1 id="page-title">나의 교육 여정을<br />찾아보세요.</h1>
        <p className="hero-description">사번을 입력하면 현재 소속과 직무, 레벨을 확인할 수 있습니다.</p>
        <form className="search-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="employee-id">사번</label>
          <div className="search-row">
            <input id="employee-id" name="employeeId" type="text" value={employeeId} placeholder="예: AI00009" onChange={(event) => setEmployeeId(event.target.value)} autoComplete="off" aria-describedby={message ? 'search-message' : undefined} />
            <button type="submit">정보 조회 <span aria-hidden="true">→</span></button>
          </div>
          <p className="input-help">실습 데이터에 등록된 사번을 입력해 주세요.</p>
          {message && <p className="search-message" id="search-message" role="alert">{message}</p>}
        </form>
      </section>
      {result ? (
        <section className="result-section" aria-live="polite" aria-labelledby="result-title">
          <div className="result-heading"><p className="eyebrow">EMPLOYEE PROFILE</p><h2 id="result-title"><strong>{result.name}</strong>님의 현재 정보</h2></div>
          <article className="profile-card">
            <div className="profile-top"><div className="avatar" aria-hidden="true">{result.name.slice(-1)}</div><div><p className="employee-name">{result.name}</p><p className="employee-id">{result.employee_id}</p></div><div className="level-pill">{result.current_level}</div></div>
            <dl className="info-grid">
              <div><dt>소속</dt><dd>{result.department_name}</dd></div>
              <div><dt>파트</dt><dd>{result.part_name}</dd></div>
              <div><dt>직무</dt><dd>{result.job_name}</dd></div>
              <div><dt>현재 레벨</dt><dd>{result.current_level}</dd></div>
            </dl>
          </article>
          <section className="next-level-card" aria-label="다음 목표 레벨">
            <p>다음 목표</p>
            <strong>{nextLevelByCurrentLevel[result.current_level]}</strong>
            <span>{result.current_level === 'LV1' ? '특급 엔지니어는 명칭만 표시하며, 연결된 JQC나 교육 과정은 없습니다.' : `${result.current_level} 다음 단계로 준비할 레벨입니다.`}</span>
          </section>
          {result.current_level !== 'LV1' && <p className="next-step-note">이 목표에 필요한 JQC와 교육 안내는 다음 단계에서 제공될 예정입니다.</p>}
        </section>
      ) : (
        <section className="empty-section" aria-label="조회 안내"><div className="compass" aria-hidden="true">✦</div><p>사번을 조회하면 이곳에 직원 정보가 표시됩니다.</p></section>
      )}
      <footer>교육 네비게이터 · 실습용 데이터 기반 서비스</footer>
    </main>
  )
}

export default App
