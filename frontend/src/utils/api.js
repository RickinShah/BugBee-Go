const config = {
    host: "localhost",
    protocol: "http",
    port: "4000",
};

export const chatURL = "https://bugbee-go-1.onrender.com";
export const chatHost = "bugbee-go-1.onrender.com"
// export const appHost = "bugbee-go-1.onrender.com"
export const vcHost = "localhost:3010";

const showErrorNotification = (message) => {
    // Remove existing notification if any

    // if (existingNotification) {
    //     existingNotification.remove();
    // }

    // Create a new notification
    const notification = document.createElement("div");
    notification.id = "error-notification";
    notification.className =
        "fixed top-5 right-5 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in flex items-center";

    // Error text
    const messageText = document.createElement("span");
    messageText.innerText = message;

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "✖";
    closeButton.className = "ml-4 font-bold cursor-pointer";
    closeButton.onclick = () => notification.remove();

    // Append elements
    notification.appendChild(messageText);
    notification.appendChild(closeButton);
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification) notification.remove();
    }, 2000);
};

export const onErrorDefault = (error) => {
    let message = "";
    for (let key in error) {
        if (typeof error[key] === "object" && error[key] !== null) {
            for (let subKey in error[key]) {
                // showErrorNotification(error[key][subKey]);
                message += `${subKey}: ${error[key][subKey]}\n`;
            }
        } else {
            // showErrorNotification(error[key]);
            message += `${key}: ${error[key]}\n`;
        }
    }
    console.log(message);
    showErrorNotification(message);
};

// export const onErrorDefault = (error) => {
//     for (let key in error) {
//         if (typeof error[key] === "object" && error[key] !== null) {
//             // console.log("${key}:", error[key]);
//             for (let subKey in error[key]) {
//                 alert(`${subKey}: ${error[key][subKey]}`);
//             }
//         } else {
//             alert(`${key}: ${error[key]}`);
//         }
//     }
// };

export const getValueFromURL = (name) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(name);
};

export const apiCall = async (
    endpoint,
    method = "GET",
    data = null,
    headers = {},
    credentials = null,
    isMultipart,
    onSuccess,
    onError = null,
) => {
    const baseUrl = `${config.protocol}://${config.host}:${config.port}`;

    try {
        const fetchOptions = {
            method,
            headers: isMultipart
                ? headers
                : {
                    "Content-Type": "application/json",
                    ...headers,
                },
            body: data ? (isMultipart ? data : JSON.stringify(data)) : null,
        };
        // console.log(fetchOptions);
        if (credentials) {
            fetchOptions.credentials = credentials;
        }

        const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
        const responseData = await response.json();

        if (response.ok) {
            onSuccess(responseData);
        } else {
            const errorHandler = onError || onErrorDefault;
            if (onError != null) {
                errorHandler(response);
            }
            errorHandler(responseData);
        }
    } catch (error) {
        // console.error("API Error: ", error);
        const errorHandler = onError || onErrorDefault;
        errorHandler(error);
    }
};

export const chatApiCall = async (
    endpoint,
    method = "GET",
    data = null,
    headers = {},
    credentials = null,
    isMultipart,
    onSuccess,
    onError = null,
) => {
    const baseUrl = `${config.protocol}://${config.host}:${config.port}/chat/api`;

    try {
        const fetchOptions = {
            method,
            headers: isMultipart
                ? headers
                : {
                    "Content-Type": "application/json",
                    ...headers,
                },
            body: data ? (isMultipart ? data : JSON.stringify(data)) : null,
        };
        // console.log(fetchOptions);
        if (credentials) {
            fetchOptions.credentials = credentials;
        }

        const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
        const responseData = await response.json();

        if (response.ok) {
            onSuccess(responseData);
        } else {
            const errorHandler = onError || onErrorDefault;
            if (onError != null) {
                errorHandler(response);
            }
            errorHandler(responseData);
        }
    } catch (error) {
        // console.error("API Error: ", error);

        const errorHandler = onError || onErrorDefault;
        errorHandler(error);
    }
};

export const getMediaPath = (dirPath) => {
    return "https://gdczpdxnljndildarnaj.supabase.co/storage/v1/object/public/bugbee" + dirPath;
    // return `${config.protocol}://${config.host}:${config.port}/media${dirPath}`;
};

export const getDefaultProfilePath = () => {
    // return `${config.protocol}://${config.host}:${config.port}/media/bugbee/profiles/default.png`;
    return "https://gdczpdxnljndildarnaj.supabase.co/storage/v1/object/public/bugbee/profiles/default.png";
};

export const copyToClipboard = (currentPostId) => {
    const host = window.location.origin;
    const fullUrl = `${host}/posts/${currentPostId}`;
    navigator.clipboard
        .writeText(fullUrl)
        .then(() => {
            showErrorNotification("Copied to clipboard");
            console.log("Copied to clipboard:", fullUrl);
            // You can add a toast/alert here if needed
        })
        .catch((err) => {
            console.error("Failed to copy:", err);
        });
};
