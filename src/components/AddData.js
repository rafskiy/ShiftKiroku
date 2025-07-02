// src/components/AddData.js
import React, { useState } from 'react';
import { db } from '../firebase'; // Import the Firestore instance
import { collection, addDoc } from 'firebase/firestore';

function AddData() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        name,
        email,
        createdAt: new Date()
      });
      console.log('Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">Add User</button>
    </form>
  );
}

export default AddData;
