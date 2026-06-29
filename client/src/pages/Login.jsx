import React, { useState, useEffect } from "react"; // 1. Add useEffect
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux"; // 2. Add useSelector
import { setCredentials } from "../redux/authSlice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 3. Look inside the Redux vault
  const user = useSelector((state) => state.auth.user);

  // 4. THE BOUNCER: If a user is already logged in, redirect them immediately!
  useEffect(() => {
    if (user) {
      const userRole = user.role.toUpperCase().trim();
      console.log(userRole);

      if (userRole === "STUDENT") {
        navigate("/student-dashboard", { replace: true });
      } else if (userRole === "TEACHER") {
        navigate("/faculty-dashboard", { replace: true });
      } else if (userRole === "ADMIN" || userRole === "TECHNICIAN") {
        navigate("/admin-dashboard", { replace: true });
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error);
        return;
      }

      // 5. When this fires, Redux updates.
      // The useEffect above will instantly detect it and handle the redirect!
      dispatch(setCredentials(data.user));
    } catch (error) {
      console.error("Login request failed", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="min-h-screen py-6 flex flex-col justify-center sm:py-12 flex-1">
          <div className="relative py-3 sm:max-w-xl sm:mx-auto">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-x shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl opacity-80"></div>

            {/* THE GLASS CARD */}
            <div className="relative px-4 py-10 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl sm:rounded-3xl sm:p-20">
              <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white drop-shadow-md">
                    Sign in to your account
                  </h2>

                  {/* Error Message Display (Also glassified) */}
                  {errorMessage && (
                    <div className="mt-4 text-center text-sm font-semibold text-red-200 bg-red-500/20 backdrop-blur-md border border-red-500/30 p-2 rounded">
                      {errorMessage}
                    </div>
                  )}
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                  <form
                    onSubmit={handleLogin}
                    method="POST"
                    className="space-y-6"
                  >
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm/6 font-medium text-white drop-shadow-sm"
                      >
                        Email address
                      </label>
                      <div className="mt-2">
                        <input
                          id="email"
                          type="email"
                          name="email"
                          required
                          autoComplete="email"
                          // Glass inputs
                          className="block w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-base text-white placeholder:text-gray-300 outline-none focus:bg-white/10 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 sm:text-sm/6 transition-all"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="password"
                          className="block text-sm/6 font-medium text-white drop-shadow-sm"
                        >
                          Password
                        </label>
                        <div className="text-sm">
                          <a
                            href="#"
                            className="font-semibold text-pink-300 hover:text-pink-200 transition-colors"
                          >
                            Forgot password?
                          </a>
                        </div>
                      </div>
                      <div className="mt-2">
                        <input
                          id="password"
                          type="password"
                          name="password"
                          required
                          autoComplete="current-password"
                          // Glass inputs
                          className="block w-full rounded-md bg-white/5 border border-white/10 px-3 py-1.5 text-base text-white placeholder:text-gray-300 outline-none focus:bg-white/10 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 sm:text-sm/6 transition-all"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="flex w-full justify-center rounded-md bg-pink-500/80 hover:bg-pink-500 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-lg backdrop-blur-sm border border-pink-400/50 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500"
                      >
                        Sign in
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
