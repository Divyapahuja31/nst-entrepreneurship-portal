import {Form} from 'react-router'

function SignIn() {
  return (
    <>
      <h1>Sign In</h1>
      <h3>
        Access is restricted, Student must be on the approval list; faculty are
        reviewed manually
      </h3>
      <Form method="post">
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

export default SignIn
