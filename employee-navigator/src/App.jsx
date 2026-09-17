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
const COMPLETED_RESULTS = ['수료', '우수']
const APPLICATION_STORAGE_KEY = 'education-navigator-applications'

function getStoredApplications() {
  try {
    const storedValue = localStorage.getItem(APPLICATION_STORAGE_KEY)
    const parsedValue = storedValue ? JSON.parse(storedValue) : []
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(`${dateValue}T00:00:00`))
}

function getReadiness(employeeId, jqcId) {
  const courseIds = [...new Set(
    sourceData.jqc_course_map
      .filter((mapping) => mapping.jqc_id === jqcId && mapping.requirement_type === 'REQUIRED')
      .map((mapping) => mapping.course_id),
  )]

  if (courseIds.length === 0) {
    return { totalCount: 0, completedCount: 0, percentage: null }
  }

  const completedCourseIds = new Set(
    sourceData.employee_courses
      .filter((history) => history.employee_id === employeeId && COMPLETED_RESULTS.includes(history.result))
      .map((history) => history.course_id),
  )
  const completedCount = courseIds.filter((courseId) => completedCourseIds.has(courseId)).length

  return {
    totalCount: courseIds.length,
    completedCount,
    percentage: Math.round((completedCount / courseIds.length) * 100),
  }
}

function getReadinessStatus(percentage) {
  if (percentage === 0) return '학습 시작 전'
  if (percentage === 100) return 'JQC 평가 준비 완료'
  return '학습 진행 중'
}

function App() {
  const [employeeId, setEmployeeId] = useState('')
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const [activePage, setActivePage] = useState('search')
  const [applications, setApplications] = useState(getStoredApplications)
  const [applicationMessage, setApplicationMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const normalizedId = employeeId.trim().toUpperCase()

    if (!normalizedId) {
      setResult(null)
      setMessage('사번을 입력해 주세요.')
      setActivePage('search')
      return
    }

    const employee = employees.find(({ employee_id }) => employee_id === normalizedId)
    if (!employee) {
      setResult(null)
      setMessage('입력한 사번의 직원 정보를 찾을 수 없습니다.')
      setActivePage('search')
      return
    }

    setResult(employee)
    setMessage('')
    setApplicationMessage('')
    setActivePage('profile')
  }

  function applyForSchedule(schedule) {
    if (!result) return

    const alreadyApplied = applications.some((application) => (
      application.employee_id === result.employee_id && application.schedule_id === schedule.schedule_id
    ))
    if (alreadyApplied) return

    const nextApplications = [...applications, {
      employee_id: result.employee_id,
      schedule_id: schedule.schedule_id,
      applied_at: new Date().toISOString(),
    }]

    try {
      localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(nextApplications))
      setApplications(nextApplications)
      setApplicationMessage(`${schedule.course_name} 일정에 모의 신청했습니다.`)
    } catch {
      setApplicationMessage('신청 정보를 브라우저에 저장하지 못했습니다.')
    }
  }

  const targetLevel = result ? nextLevelByCurrentLevel[result.current_level] : null
  const targetJqcs = result && result.current_level !== 'LV1'
    ? sourceData.job_jqc_map
      .filter((mapping) => mapping.job_id === result.job_id && mapping.level === targetLevel)
      .map((mapping) => sourceData.jqcs.find((jqc) => jqc.jqc_id === mapping.jqc_id))
      .filter(Boolean)
    : []

  const jqcsNeedingPrep = targetJqcs.filter((jqc) => {
    const readiness = getReadiness(result.employee_id, jqc.jqc_id)
    return readiness.percentage !== 100
  })

  const recommendedCourses = result ? (() => {
    const completedCourseIds = new Set(
      sourceData.employee_courses
        .filter((history) => history.employee_id === result.employee_id && COMPLETED_RESULTS.includes(history.result))
        .map((history) => history.course_id),
    )
    const courseMap = new Map()
    for (const jqc of jqcsNeedingPrep) {
      const courseIds = sourceData.jqc_course_map
        .filter((mapping) => mapping.jqc_id === jqc.jqc_id && mapping.requirement_type === 'REQUIRED')
        .map((mapping) => mapping.course_id)
      for (const courseId of courseIds) {
        if (completedCourseIds.has(courseId)) continue
        const course = sourceData.courses.find((item) => item.course_id === courseId)
        if (!course) continue
        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, { course, jqcs: [] })
        }
        const relatedJqcs = courseMap.get(courseId).jqcs
        if (!relatedJqcs.some((relatedJqc) => relatedJqc.jqc_id === jqc.jqc_id)) {
          relatedJqcs.push(jqc)
        }
      }
    }
    return [...courseMap.values()]
  })() : []

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
  const recommendedCoursesWithSchedules = recommendedCourses.map((recommendation) => ({
    ...recommendation,
    schedules: sourceData.schedules
      .filter((schedule) => schedule.course_id === recommendation.course.course_id && schedule.start_date >= today)
      .sort((first, second) => first.start_date.localeCompare(second.start_date)),
  }))
  const myApplications = result
    ? applications
      .filter((application) => application.employee_id === result.employee_id)
      .map((application) => sourceData.schedules.find((schedule) => schedule.schedule_id === application.schedule_id))
      .filter(Boolean)
      .sort((first, second) => first.start_date.localeCompare(second.start_date))
    : []

  const stageLabel = activePage === 'profile'
    ? 'STEP 02 · 교육생 정보'
    : activePage === 'learning'
      ? 'STEP 03 · 교육 준비 현황'
      : 'STEP 01 · 직원 정보 조회'

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setActivePage('search')} aria-label="교육 네비게이터 홈"><span className="brand-mark" aria-hidden="true">N</span><span>교육 네비게이터</span></button>
        {result ? (
          <nav className="page-nav" aria-label="교육 네비게이터 메뉴">
            <button type="button" className={activePage === 'profile' ? 'active' : ''} onClick={() => setActivePage('profile')}>교육생 정보</button>
            <button type="button" className={activePage === 'learning' ? 'active' : ''} onClick={() => setActivePage('learning')}>교육 준비</button>
          </nav>
        ) : <span className="stage-label">{stageLabel}</span>}
      </header>
      {activePage === 'search' && <section className="hero" id="top" aria-labelledby="page-title">
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
      </section>}
      {result && activePage === 'profile' && (
        <section className="result-section profile-page" aria-live="polite" aria-labelledby="result-title">
          <div className="profile-page-intro"><div><p className="eyebrow">STEP 1 · 현재 상태</p><h1 id="result-title"><strong>{result.name}</strong>님의<br />교육생 정보</h1><p>현재 역할과 다음 성장 목표를 확인하세요.</p></div><span>{result.employee_id}</span></div>
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
            <p className="step-eyebrow">STEP 2 · 다음 목표</p>
            <strong>{nextLevelByCurrentLevel[result.current_level]}</strong>
            <span>{result.current_level === 'LV1' ? '특급 엔지니어는 명칭만 표시하며, 연결된 JQC나 교육 과정은 없습니다.' : `${result.current_level} 다음 단계로 준비할 레벨입니다.`}</span>
          </section>
          <section className="profile-summary" aria-label="교육 준비 요약">
            <div><span>현재 직무</span><strong>{result.job_name}</strong></div>
            <div><span>목표 JQC</span><strong>{result.current_level === 'LV1' ? '해당 없음' : `${targetJqcs.length}개`}</strong></div>
            <div><span>추천 교육</span><strong>{result.current_level === 'LV1' ? '해당 없음' : `${recommendedCourses.length}개`}</strong></div>
          </section>
          <button className="view-learning-button" type="button" onClick={() => setActivePage('learning')}>교육 준비 현황 보기 <span aria-hidden="true">→</span></button>
        </section>
      )}
      {result && activePage === 'learning' && (
        <section className="result-section learning-page" aria-live="polite" aria-labelledby="learning-title">
          <div className="learning-page-intro"><div><p className="eyebrow">LEARNING READINESS</p><h2 id="learning-title"><strong>{result.name}</strong>님의 교육 준비 현황</h2><p>{result.job_name} · 현재 {result.current_level} · 다음 목표 {targetLevel}</p></div><button type="button" onClick={() => setActivePage('profile')}>교육생 정보 보기</button></div>
          {result.current_level !== 'LV1' && (
            <section className="jqc-section" aria-labelledby="jqc-title">
              <div className="jqc-heading">
                <div>
                  <p className="eyebrow">STEP 3 · 부족한 JQC</p>
                  <h3 id="jqc-title">{targetLevel} 달성을 위해 준비가 필요한 JQC</h3>
                </div>
                <span>{result.job_name} · {result.job_id}</span>
              </div>
              {targetJqcs.length > 0 ? (
                <>
                  <p className="section-guide">준비도가 100%보다 낮은 JQC가 있으면 아래에서 필요한 교육을 확인하세요.</p>
                  <ul className="jqc-list">
                    {targetJqcs.map((jqc) => {
                      const readiness = getReadiness(result.employee_id, jqc.jqc_id)
                      const isReady = readiness.percentage === 100
                      return (
                        <li key={jqc.jqc_id} className={isReady ? 'jqc-ready' : 'jqc-pending'}>
                          <div className="jqc-item-heading">
                            <span className="jqc-code">{jqc.jqc_id}</span>
                            {readiness.percentage !== null && (
                              <span className={isReady ? 'jqc-badge jqc-badge-ready' : 'jqc-badge jqc-badge-pending'}>
                                {isReady ? '준비 완료' : '부족'}
                              </span>
                            )}
                          </div>
                          <strong>{jqc.jqc_name}</strong>
                          {readiness.percentage === null ? (
                            <p className="readiness-empty">교육정보 없음</p>
                          ) : (
                            <div className="readiness">
                              <div className="readiness-bar" role="progressbar" aria-valuenow={readiness.percentage} aria-valuemin={0} aria-valuemax={100}>
                                <div className="readiness-bar-fill" style={{ width: `${readiness.percentage}%` }} />
                              </div>
                              <div className="readiness-meta">
                                <span>{readiness.completedCount}/{readiness.totalCount} 과정 이수 · {readiness.percentage}%</span>
                                <span className="readiness-status">{getReadinessStatus(readiness.percentage)}</span>
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <p className="no-jqc-message">현재 직무와 다음 목표 레벨에 연결된 JQC 정보가 없습니다.</p>
              )}
            </section>
          )}
          {result.current_level !== 'LV1' && targetJqcs.length > 0 && (
            <section className="recommend-section" aria-labelledby="recommend-title">
              <div className="jqc-heading">
                <div>
                  <p className="eyebrow">STEP 4 · 필요한 교육</p>
                  <h3 id="recommend-title">부족한 JQC를 채우기 위한 추천 교육</h3>
                </div>
              </div>
              {recommendedCoursesWithSchedules.length > 0 ? (
                <ul className="recommend-list">
                  {recommendedCoursesWithSchedules.map(({ course, jqcs, schedules }) => (
                    <li key={course.course_id}>
                      <span className="jqc-code">{course.course_id}</span>
                      <strong>{course.course_name}</strong>
                      <p className="recommend-reason">
                        <strong>{targetLevel}</strong> 목표 달성을 위해 필요한 JQC와 연계된 교육입니다.
                      </p>
                      <ul className="recommend-jqc-tags">
                        {jqcs.map((jqc) => (
                          <li key={jqc.jqc_id}>{jqc.jqc_id} · {jqc.jqc_name}</li>
                        ))}
                      </ul>
                      <div className="schedule-area">
                        <span className="schedule-label">예정된 일정</span>
                        {schedules.length > 0 ? (
                          <ul className="schedule-list">
                            {schedules.map((schedule) => {
                              const alreadyApplied = applications.some((application) => (
                                application.employee_id === result.employee_id && application.schedule_id === schedule.schedule_id
                              ))
                              return (
                                <li key={schedule.schedule_id}>
                                  <div><b>{formatDate(schedule.start_date)}</b><span>{schedule.duration_days}일 · {schedule.status}</span></div>
                                  <button type="button" className="apply-button" disabled={alreadyApplied} onClick={() => applyForSchedule(schedule)}>
                                    {alreadyApplied ? '신청 완료' : '모의 신청'}
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        ) : <p className="no-schedule">신청 가능한 예정 일정이 없습니다.</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-jqc-message">준비가 필요한 JQC에 아직 이수하지 않은 추천 교육이 없습니다.</p>
              )}
            </section>
          )}
          {result && (
            <section className="application-section" aria-labelledby="application-title">
              <div className="jqc-heading"><div><p className="eyebrow">MY APPLICATIONS</p><h3 id="application-title">나의 신청 교육</h3></div><span>실습용 모의 신청</span></div>
              {applicationMessage && <p className="application-message" role="status">{applicationMessage}</p>}
              {myApplications.length > 0 ? (
                <ul className="application-list">
                  {myApplications.map((schedule) => <li key={schedule.schedule_id}><div><b>{schedule.course_name}</b><span>{formatDate(schedule.start_date)} · {schedule.duration_days}일</span></div><em>{schedule.schedule_id}</em></li>)}
                </ul>
              ) : <p className="no-jqc-message">현재 사번으로 신청한 교육이 없습니다.</p>}
            </section>
          )}
        </section>
      )}
      {!result && activePage === 'search' && (
        <section className="empty-section" aria-label="조회 안내"><div className="compass" aria-hidden="true">✦</div><p>사번을 조회하면 이곳에 직원 정보가 표시됩니다.</p></section>
      )}
      <footer>교육 네비게이터 · 실습용 데이터 기반 서비스</footer>
    </main>
  )
}

export default App
