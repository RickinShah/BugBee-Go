import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
    stages: [
        { duration: "10s", target: 100 }, // Ramp up to 100 users
        { duration: "30s", target: 100 }, // Stay at 100 users
        { duration: "10s", target: 0 }, // Ramp down
    ],
};

export default function () {
    const sharedUsername = `user_${__VU}_${__ITER}`; // Unique username
    // console.log(sharedUsername);
    let headers = { "Content-Type": "application/json" };
    let payload = JSON.stringify({ username: sharedUsername });

    // First request
    let res1 = http.post("http://localhost:4000/v1/users/get", payload, {
        headers,
    });
    // console.log(res1.json());

    check(res1, {
        "Step 1: User retrieved (1st request)": (r) => r.status === 200,
        // "Step 1: Contains expected username": (r) =>
        //     r.json().user.username === sharedUsername,
    });

    sleep(1);

    // Second request
    let res2 = http.post("http://localhost:4000/v1/users/get", payload, {
        headers,
    });

    check(res2, {
        "Step 2: User retrieved (2nd request)": (r) => r.status === 200,
        // "Step 2: Contains expected username": (r) =>
        //     r.json().user.username === sharedUsername,
    });

    sleep(1);

    let res3 = http.post("http://localhost:4000/v1/users/get", payload, {
        headers,
    });

    check(res2, {
        "Step 2: User retrieved (2nd request)": (r) => r.status === 200,
        // "Step 2: Contains expected username": (r) =>
        //     r.json().user.username === sharedUsername,
    });

    sleep(1);

    let res4 = http.post("http://localhost:4000/v1/users/get", payload, {
        headers,
    });

    check(res2, {
        "Step 2: User retrieved (2nd request)": (r) => r.status === 200,
        // "Step 2: Contains expected username": (r) =>
        //     r.json().user.username === sharedUsername,
    });
    sleep(1);

    let res5 = http.post("http://localhost:4000/v1/users/get", payload, {
        headers,
    });

    check(res2, {
        "Step 2: User retrieved (2nd request)": (r) => r.status === 200,
        // "Step 2: Contains expected username": (r) =>
        //     r.json().user.username === sharedUsername,
    });
}
