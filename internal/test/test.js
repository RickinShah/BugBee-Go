import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
    stages: [
        { duration: "10s", target: 100 }, // Ramp up to 50 users
        { duration: "30s", target: 100 }, // Stay at 50 users
        { duration: "10s", target: 0 }, // Ramp down
    ],
};

export default function () {
    let headers = { "Content-Type": "application/json" };

    // Generate unique email and username
    let email = `user${__VU}_${__ITER}@example.com`; // Unique email
    let username = `user_${__VU}_${__ITER}`; // Unique username

    // Step 1: Submit Email
    let payload1 = JSON.stringify({ email });
    let res1 = http.patch("http://localhost:4000/v1/register/email", payload1, {
        headers,
    });

    check(res1, { "Step 1: Email accepted": (r) => r.status === 200 });
    let responseData = res1.json();
    let reg_id = responseData.reg_id; // Extract reg_id from response
    if (!reg_id) {
        console.error("Failed to get reg_id in Step 1: ", responseData);
        return;
    }

    sleep(1); // Simulate user delay

    // Step 2: Submit Username & Full Name
    let payload2 = JSON.stringify({ reg_id, username, name: "Test User" });
    let res2 = http.patch(
        "http://localhost:4000/v1/register/username",
        payload2,
        { headers },
    );

    check(res2, { "Step 2: Username accepted": (r) => r.status === 200 });

    sleep(1);

    // Step 3: Submit Password & Confirm Password
    let payload3 = JSON.stringify({
        reg_id,
        password: "StrongPassword123",
        confirm_password: "StrongPassword123",
    });
    let res3 = http.post("http://localhost:4000/v1/users", payload3, {
        headers,
    });

    check(res3, { "Step 3: Password set": (r) => r.status === 201 });

    sleep(1);
}
