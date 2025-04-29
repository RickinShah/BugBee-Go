import * as yup from "yup";
export const validateUsernameOrEmail = yup
    .string()
    .matches(
        "^[a-zA-Z0-9.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*|^[a-zA-Z0-9_]+$",
        "Enter a valid Email or Username",
    )
    .required("Username/Email must be provided");

export const validateUsername = yup
    .string()
    .min(3, "Username should have at least 3 characters")
    .matches(
        "^[a-zA-Z0-9_]+$",
        "Username should only contain alphabets, numbers and underscore",
    )
    .required("Username must be provided");

export const validateName = yup
    .string()
    .max(50, "Name should not be more than 50 characters")
    .optional();

export const validateBio = yup
    .string()
    .max(150, "Bio should not be more than 150 characters")
    .optional();

// export const validateEmail = yup
//     .string()
//     .matches(
//         "^[a-zA-Z0-9.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
//         "Enter a valid Email",
//     )
//     .required("Email must be provided");

export const validateEmail = yup
    .string()
    .matches(
        /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*indusuni\.ac\.in$/,
        "Email must be an indusuni.ac.in address",
    )
    .required("Email must be provided");

export const validatePassword = yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not be more than 72 characters")
    .required("Password must be provided");

export const validateConfirmPassword = yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Confirm Password is required");

export const validateOTP = yup
    .string()
    .length(6, "OTP must have exactly 6 digits")
    .matches("^[0-9]+$", "OTP should only contain numeric digits")
    .required();
