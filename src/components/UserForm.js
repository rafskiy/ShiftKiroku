import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase'; // adjust the path if your firebase.js is elsewhere

function UserForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const docRef = await addDoc(collection(db, 'users'), {
        name,
        email,
        createdAt: new Date(),
      });
      console.log('Document written with ID: ', docRef.id);
      setName('');
      setEmail('');
      alert('User added successfully!');
    } catch (e) {
      console.error('Error adding document: ', e);
      setError('Failed to add user: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add New User</h2>

      <div>
        <label>Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}

export default UserForm;
