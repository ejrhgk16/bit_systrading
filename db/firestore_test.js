const { db } = require('./firebaseConfig.js');
const { collection, addDoc, getDocs, query, where } = require('firebase/firestore');
const { consoleLogger } = require('../common/logger.js');

// Firestore에 데이터를 추가하는 예제 함수
async function addUser(name, email) {
  try {
    const docRef = await addDoc(collection(db, "users"), {
      name: name,
      email: email,
      createdAt: new Date()
    });
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    consoleLogger.error("Error adding document: ", e);
  }
}

// Firestore에서 모든 사용자 데이터를 가져오는 예제 함수
async function getAllUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    console.log("All users:");
    querySnapshot.forEach((doc) => {
      consoleLogger.info(`${doc.id} =>`, doc.data());
    });
  } catch (e) {
    consoleLogger.error("Error getting documents: ", e);
  }
}

// 특정 이메일로 사용자를 찾는 예제 함수
async function findUserByEmail(email) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log(`No user found with email: ${email}`);
        return null;
      }
      
      console.log(`User found with email ${email}:`);
      querySnapshot.forEach((doc) => {
        consoleLogger.info(`${doc.id} =>`, doc.data());
      });
      return querySnapshot.docs[0].data();

    } catch (e) {
      consoleLogger.error("Error finding document: ", e);
    }
  }

// 테스트 실행을 위한 메인 함수
async function main() {
  console.log("--- Firestore Test Start ---");

  // 1. 사용자 추가
  console.log("\n1. Adding new users...");
  await addUser("Alice", "alice@example.com");
  await addUser("Bob", "bob@example.com");

  // 2. 모든 사용자 조회
  console.log("\n2. Getting all users...");
  await getAllUsers();

  // 3. 특정 사용자 조회
  console.log("\n3. Finding a specific user by email...");
  await findUserByEmail("alice@example.com");

  console.log("\n--- Firestore Test End ---");
}

main().catch(error => consoleLogger.error('Main test function failed:', error));
