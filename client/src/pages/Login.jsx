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

  const API_URL = import.meta.env.VITE_API_URL;

  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (user) {
      const userRole = user.role.toUpperCase().trim();
      console.log(userRole);

      if (userRole === "STUDENT") {
        navigate("/student-dashboard", { replace: true });
      } else if (userRole === "FACULTY") {
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
      const response = await fetch(`${API_URL}/api/login`, {
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

      dispatch(setCredentials(data.user));
      console.log(data.user)
    } catch (error) {
      console.error("Login request failed", error);
      setErrorMessage("Could not connect to the server.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-[url(/login.png)] bg-cover">
        <div className="min-h-screen py-6 flex flex-col justify-center sm:py-12 flex-1">
          <div className="relative py-3 sm:max-w-xl sm:mx-auto">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-x shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl opacity-80"></div>

            {/* THE GLASS CARD */}
            <div className="relative px-4 py-10 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl sm:rounded-3xl sm:p-20">
              <div className="flex min-h-full flex-col justify-center px-6  lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <img
                    src="/alab-logo-3.svg"
                    alt="LOGO"
                    className="w-50 bg-white rounded-3xl mx-auto"
                  />
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
                          className="block w-full rounded-md bg-white/5 border border-cold px-3 py-1.5 text-base text-white placeholder:text-gray-300 outline-none focus:bg-white/10 focus:border-navy sm:text-sm/6 transition-all"
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
                        
                      </div>
                      <div className="mt-2">
                        <input
                          id="password"
                          type="password"
                          name="password"
                          required
                          autoComplete="current-password"
                          className="block w-full rounded-md bg-white/5 border border-cold px-3 py-1.5 text-base text-white placeholder:text-gray-300 outline-none focus:bg-white/10 focus:border-navy  sm:text-sm/6 transition-all"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        className="flex w-full justify-center rounded-md bg-[#F5990A] hover:bg-[#83BFFF] px-3 py-1.5 text-sm/6 font-semibold text-white shadow-lg backdrop-blur-sm border border-navy transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500"
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
