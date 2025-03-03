const config = {
    host: "localhost",
    protocol: "http",
    port: "4000",
};

const onErrorDefault = (error) => {
    for (let key in error) {
        if (typeof error[key] === "object" && error[key] !== null) {
            // console.log("${key}:", error[key]);
            for (let subKey in error[key]) {
                alert(`${subKey}: ${error[key][subKey]}`);
            }
        } else {
            alert(`${key}: ${error[key]}`);
        }
    }
};

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
    onError = onErrorDefault,
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
        } else if (response.status == 401) {
            window.location.href = `${baseUrl}/`;
        } else {
            onErrorDefault(responseData);
        }
    } catch (error) {
        // console.error("API Error: ", error);
        onError(error);
    }
};
