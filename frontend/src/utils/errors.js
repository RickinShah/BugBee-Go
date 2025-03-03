export const validationError = (errors) => {
    if (Array.isArray(errors)) {
        errors.forEach((error) => alert(error));
    } else {
        console.log(errors);
    }
};
