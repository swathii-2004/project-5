importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "VITE_FIREBASE_API_KEY_PLACEHOLDER",
  projectId: "proximart-86949",
  messagingSenderId: "959505428673",
  appId: "1:959505428673:web:be4b46c941a05dcf04a440"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification
  self.registration.showNotification(title, {
    body,
    icon: "/vite.svg"
  })
})
