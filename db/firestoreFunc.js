const { db } = require('./firebaseConfig.js');
// getDoc, setDoc 추가 및 serverTimestamp를 require로 변경
const { collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } = require('firebase/firestore');

async function getTradeStatus(docId){
    try {
        const snap = await getDoc(doc(db, "trade_status", docId)); //문서아이디로 조회
        if (snap.exists()) {
            return snap.data()
        }else{
            return null
        }
    }catch(e){
        console.error("Error getting documents: ", e);
    }
}

// Firestore에 문서를 설정하는 예제 함수 (사용자 지정 ID 또는 덮어쓰기/병합)
async function setTradeStatus(documentId, data, merge = true) { // merge 기본값을 true로 변경
    try {
        const docRef = doc(db, "trade_status", documentId);
        await setDoc(docRef, data, { merge: merge });
        return true;
    } catch (e) {
        console.error("Error setting document: ", e);
        return false;
    }
}

// Firestore에 데이터를 추가하는 예제 함수
async function addTradeLog(data) {
  try {
    const docRef = await addDoc(collection(db, "trade_log"), {
        ...data,
        timestamp : serverTimestamp()
    });
    // console.log("Document written with ID: ", docRef.id); // 성공 로그는 일단 주석 처리
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

module.exports = { getTradeStatus, setTradeStatus, addTradeLog };
