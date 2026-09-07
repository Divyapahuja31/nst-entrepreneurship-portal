import {Form} from 'react-router'

function SignUp() {

  return (
    <>
      <h1>Sign Up</h1>
      <h3>
        Access is restricted, Student must be on the approval list; faculty are
        reviewed manually
      </h3>
      <Form method="post">
        <select name="position">
          <option value="student">Student (Founder)</option>
          <option value="faculty/staff">Faculty/Staff</option>
        </select>
        <input type="text" placeholder="Enter your fullname" name="username" />
        <input type="email" placeholder="Enter your email" name="email" />
        <input
          type="password"
          placeholder="Enter your password"
          name="password"
        />
        <input type="submit" />
      </Form>
    </>
  )
}

export default SignUp
