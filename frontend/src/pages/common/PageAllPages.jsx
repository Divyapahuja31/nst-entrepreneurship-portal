export default function PageAllPages() {
  return (
    <div>
      <h1>All Pages</h1>
      <p>This is a test page that lists all the pages in the application.</p>
      <ul>
        <li>
          <a href="/">Home</a>
        </li>
        <li>
          <a href="/onboarding">Onboarding</a>
        </li>
        <li>
          <a href="/kpis">KPIs</a>
        </li>
        <li>
          <a href="/create-proposal">Create Proposal</a>
        </li>
        <li>
          <a href="/methodology">Methodology</a>
        </li>
        <li>
          <a href="/complete-signup">Complete Signup</a>
        </li>
        <li>
          <a href="/admin">Admin Overview</a>
        </li>
        <li>
          <a href="/admin/portfolio">Admin Portfolio</a>
        </li>
        <li>
          <a href="/admin/profile/:userid">Admin Profile</a>
        </li>
        <li>
          <a href="/test/all-pages">Test All Pages</a>
        </li>
      </ul>
    </div>
  )
}
