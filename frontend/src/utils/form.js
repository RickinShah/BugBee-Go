export const handleFormChange = (e, setFormData) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
        ...prev,
        [name]: value,
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
