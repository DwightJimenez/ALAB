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

      if (userRole === "STUDENT") {
        navigate("/student-dashboard", { replace: true });
      } else if (userRole === "TEACHER") {
        navigate("/faculty-dashboard", { replace: true });
      } else if (userRole === "ADMIN" || userRole === "TECHNICIAN") {
        navigate("/admin-dashboard", { replace: true });
      }
    }
  }, [user, navigate]); // This runs every time the 'user' state changes

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
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="min-h-screen py-6 flex flex-col justify-center sm:py-12 flex-1">
          <div className="relative py-3 sm:max-w-xl sm:mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-300 to-pink-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
            <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20 dark:bg-gray-800">
              <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-pink-600 dark:text-white">
                    Sign in to your account
                  </h2>

                  {/* Error Message Display */}
                  {errorMessage && (
                    <div className="mt-4 text-center text-sm font-semibold text-red-500 bg-red-100 p-2 rounded">
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
                      {/* Changed 'for=' to 'htmlFor=' */}
                      <label
                        htmlFor="email"
                        className="block text-sm/6 font-medium text-pink-500 dark:text-gray-100"
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
                          className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-pink-500 dark:text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-pink-500 sm:text-sm/6"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="password"
                          className="block text-sm/6 font-medium text-pink-500 dark:text-gray-100"
                        >
                          Password
                        </label>
                        <div className="text-sm">
                          <a
                            href="#"
                            className="font-semibold text-pink-400 hover:text-pink-300"
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
                          className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-pink-500 dark:text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-pink-500 sm:text-sm/6"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="flex w-full justify-center rounded-md bg-pink-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-pink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500"
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

        {/* Right side banner panel */}
        <div className="relative flex items-center justify-center w-full h-screen flex-1 p-10 bg-pink-300">
          <div className="absolute inset-0 bg-white/30 backdrop-blur-xs"></div>
          <div className="relative z-10 text-center text-3xl font-bold text-pink-600 drop-shadow-md">
            ALAB: Adaptive Laboratory Assessment and Bayesian-Knowledge
            Management System
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
