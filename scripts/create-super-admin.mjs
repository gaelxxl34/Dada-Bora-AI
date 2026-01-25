/**
 * Create Super Admin User Script
 * Usage: npm run create-admin
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createInterface } from "readline";
import { readFileSync } from "fs";

// Load service account for Auth
const serviceAccount = JSON.parse(
  readFileSync("./fast-4e4c4-firebase-adminsdk-lotkj-8fe1358650.json", "utf8"),
);

// Admin app for Auth
const app = initializeApp({
  credential: cert(serviceAccount),
});
const auth = getAuth(app);

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Use REST API to write to Firestore
async function writeToFirestore(collection, docId, data) {
  const projectId = "fast-4e4c4";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;

  // Convert data to Firestore format
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    }
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getAccessToken()}`,
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }
  return response.json();
}

async function getAccessToken() {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function createSuperAdmin() {
  console.log("\n🌸 Dada Bora AI - Create Super Admin\n");

  const firstName = await prompt("First Name: ");
  const lastName = await prompt("Last Name: ");
  const email = await prompt("Email: ");
  const password = await prompt("Password: ");

  try {
    // Create user in Auth
    const user = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });
    console.log("✅ Auth user created:", user.uid);

    // Save to Firestore via REST API
    await writeToFirestore("users", user.uid, {
      firstName,
      lastName,
      email,
      role: "super_admin",
      createdAt: new Date(),
    });
    console.log("✅ Firestore document created");

    console.log("\n🎉 Super Admin created successfully!");
    console.log("   Email:", email);
    console.log("   UID:", user.uid);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  process.exit(0);
}

createSuperAdmin();
