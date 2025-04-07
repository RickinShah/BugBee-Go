export const handleFormChange = (e, setFormData) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
    }));
};

export const addFieldInFormData = (data, name, value) => {
    return {
        ...data,
        [name]: value,
    };
};

export const removeFieldIfEmpty = (data, fieldName) => {
    if (data[fieldName] === "") {
        const updatedData = { ...data };
        delete updatedData[fieldName];
        return updatedData;
    }

    return data;
};

export const setToLocalStorage = (name, value) => {
    localStorage.setItem(name, value != null ? value : "");
};

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard");
    } catch (err) {
        console.error(err);
    }
};
