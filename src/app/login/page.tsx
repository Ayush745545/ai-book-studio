"use client";

import React from 'react';
import styled from 'styled-components';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

const Form = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const submittingRef = React.useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) {
      return;
    }

    setError("");
    submittingRef.current = true;
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <StyledWrapper>
      <form className="form" onSubmit={onSubmit}>
        <Link href="/" className="back-link">
          ← Back to home
        </Link>
        {error && <div className="error-msg" role="alert">{error}</div>}
        <div className="flex-column">
          <label>Email</label>
        </div>
        <div className="inputForm">
          <svg height={20} viewBox="0 0 32 32" width={20} xmlns="http://www.w3.org/2000/svg"><g id="Layer_3" data-name="Layer 3"><path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z" /></g></svg>
          <input
            type="text"
            className="input"
            placeholder="Enter your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex-column">
          <label>Password</label>
        </div>
        <div className="inputForm">
          <svg height={20} viewBox="-64 0 512 512" width={20} xmlns="http://www.w3.org/2000/svg"><path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0" /><path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0" /></svg>
          <input
            type="password"
            className="input"
            placeholder="Enter your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <svg viewBox="0 0 576 512" height="1em" xmlns="http://www.w3.org/2000/svg"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z" /></svg>
        </div>
        <button type="submit" className="button-submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in / Create account"}
        </button>
      </form>
    </StyledWrapper>
  );
};

export default Form;

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
  background: #000;

  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    padding: 30px;
    width: 450px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow:
      0 25px 50px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .form::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.12) 0%,
      transparent 100%
    );
    pointer-events: none;
    border-radius: 20px 20px 0 0;
  }

  .back-link {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    text-decoration: none;
    transition: color 0.2s ease;
    align-self: flex-start;
    margin-bottom: 4px;
  }

  .back-link:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  .error-msg {
    color: #fca5a5;
    font-size: 13px;
    text-align: center;
    padding: 10px;
    background: rgba(254, 242, 242, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(254, 202, 202, 0.2);
  }

  ::placeholder {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  .form button {
    align-self: flex-end;
  }

  .flex-column > label {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    font-size: 14px;
  }

  .inputForm {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-top: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    height: 50px;
    display: flex;
    align-items: center;
    padding-left: 12px;
    transition: 0.2s ease-in-out;
    background: rgba(255, 255, 255, 0.04);
  }

  .inputForm:hover {
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.07);
  }

  .input {
    margin-left: 10px;
    border-radius: 12px;
    border: none;
    width: 85%;
    height: 100%;
    background: transparent;
    color: #fff;
    font-size: 14px;
  }

  .input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  .input:focus {
    outline: none;
  }

  .inputForm:focus-within {
    border: 1.5px solid rgba(45, 121, 243, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  .button-submit {
    margin: 20px 0 10px 0;
    background: linear-gradient(135deg, #1d1d1f 0%, #2c2c2e 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 15px;
    font-weight: 500;
    border-radius: 12px;
    height: 50px;
    width: 100%;
    cursor: pointer;
    transition: 0.2s ease-in-out;
  }

  .button-submit:hover {
    background: linear-gradient(135deg, #2c2c2e 0%, #3a3a3c 100%);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .button-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
