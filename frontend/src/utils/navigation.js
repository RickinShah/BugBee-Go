let goToFunction = null;

export const setGoTo = (fn) => {
    goToFunction = fn;
};

export const goTo = (path, params = {}) => {
    if (goToFunction) {
        goToFunction(path, params);
    } else {
        console.error("goTo function is not set yet.");
    }
};
