// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

// TODO: Add your own Firebase configuration here
// https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
  apiKey: "AIzaSyC57uhmwcnE9_CnE898pea5PVAoH2jTL0g",
  authDomain: "systrading-5ac33.firebaseapp.com",
  projectId: "systrading-5ac33",
  storageBucket: "systrading-5ac33.firebasestorage.app",
  messagingSenderId: "488454558085",
  appId: "1:488454558085:web:d251319e6181655d31f4ec"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

module.exports = { db };