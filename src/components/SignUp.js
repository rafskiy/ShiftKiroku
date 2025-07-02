import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setSuccessMessage("User signed up successfully! You can now log in.");
      console.log("User signed up:", user.uid);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign Up</button>
    </form>
  );
}

export default SignUp;
