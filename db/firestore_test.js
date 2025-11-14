const { db } = require('./firebaseConfig.js');
const { collection, addDoc, getDocs, query, where } = require('firebase/firestore');

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
    console.error("Error adding document: ", e);
  }
}

// Firestore에서 모든 사용자 데이터를 가져오는 예제 함수
async function getAllUsers() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    console.log("All users:");
    querySnapshot.forEach((doc) => {
      console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
    });
  } catch (e) {
    console.error("Error getting documents: ", e);
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
        console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
      });
      return querySnapshot.docs[0].data();

    } catch (e) {
      console.error("Error finding document: ", e);
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

// 메인 함수 실행
// 중요: 이 스크립트를 실행하기 전에 common/firebaseConfig.js 파일에
//      자신의 Firebase 프로젝트 설정 값을 입력해야 합니다.
main().catch(console.error);
