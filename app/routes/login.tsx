import type { ActionFunctionArgs, LoaderFunctionArgs } from "partymix";
import { json } from "partymix";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import {
  createUserSession,
  getUserName,
  verifyPassword,
} from "~/utils/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userName = await getUserName(request);
  if (userName) {
    // Already logged in, redirect to home
    return new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = formData.get("password");
  const name = formData.get("name");
  const redirectTo = formData.get("redirectTo") || "/";

  if (typeof password !== "string" || typeof name !== "string") {
    return json(
      { error: "Please provide both password and name" },
      { status: 400 }
    );
  }

  if (name.trim().length === 0) {
    return json({ error: "Please enter your name" }, { status: 400 });
  }

  if (password.trim().length === 0) {
    return json({ error: "Please enter the password" }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return json({ error: "Incorrect password" }, { status: 401 });
  }

  return createUserSession(name.trim(), redirectTo.toString());
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  return (
    <>
      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .login-card {
          background: white;
          padding: 3rem;
          border-radius: 1rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          width: 100%;
        }

        .login-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
          text-align: center;
        }

        .login-subtitle {
          color: #666;
          text-align: center;
          margin-bottom: 2rem;
          font-size: 0.875rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          text-align: center;
        }

        .submit-button {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }

        .submit-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .submit-button:active {
          transform: translateY(0);
        }

        .household-emoji {
          text-align: center;
          font-size: 3rem;
          margin-bottom: 1rem;
        }
      `}</style>

      <div className="login-container">
        <div className="login-card">
          <div className="household-emoji">🏠</div>
          <h1 className="login-title">Household Notes</h1>
          <p className="login-subtitle">Enter the family password to continue</p>

          {actionData?.error && (
            <div className="error-message">{actionData.error}</div>
          )}

          <Form method="post">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="Enter your name"
                autoComplete="name"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Family Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="Enter the shared password"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="submit-button">
              Enter
            </button>
          </Form>
        </div>
      </div>
    </>
  );
}
