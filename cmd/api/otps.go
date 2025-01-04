package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) generateOtpHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user, err := app.models.Users.GetByEmailOrUsername(input.Username, input.Username)

	v := validator.New()
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			v.AddError("username/email", "doesn't exist")
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	otp, err := app.models.OTPs.New(user.Username, 15*time.Minute, user.ID)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	go func() {
		args := map[string]interface{}{
			"Code": otp.OTP.Code,
			"Mail": user.Email,
			"Name": user.Name,
		}
		err = app.mailer.Send(user.Email, "otp_verification.tmpl", args)
		if err != nil {
			app.logger.PrintError(err, nil)
		}
	}()

	err = app.writeJson(w, http.StatusCreated, envelope{"otp": "sent successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) validateOtpHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		Otp      string `json:"otp"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateOTPCode(v, input.Otp); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetByEmailOrUsername(input.Username, input.Username)

	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	otp, err := app.models.OTPs.Get(user.ID)

	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	otp.OTP.Code = input.Otp

	valid, err := otp.OTP.Matches(otp)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if !valid {
		v.AddError("otp", "is invalid")
		app.unauthorizedResponse(w, r, v.Errors)
	}

	if err = app.models.OTPs.Delete(user.ID); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"otp": "verified successfully"}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}
