package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"flag"
	"io"
)

func EncryptionWithHex(pt string) (string, error) {
	encryptionKey := getEncryptionKey()
	cipherKey := []byte(encryptionKey)

	if len(cipherKey) != 16 && len(cipherKey) != 24 && len(cipherKey) != 32 {
		return "", errors.New("invalid encryption key")
	}

	block, err := aes.NewCipher(cipherKey)

	if err != nil {
		return "", err
	}

	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	plainText := []byte(pt)

	cfb := cipher.NewCFBEncrypter(block, iv)
	cipherText := make([]byte, len(plainText))
	cfb.XORKeyStream(cipherText, plainText)

	return encode(append(iv, cipherText...)), nil
}

func DecryptionWithHex(ct string) (string, error) {
	encryptionKey := getEncryptionKey()
	cipherKey := []byte(encryptionKey)

	if len(cipherKey) != 16 && len(cipherKey) != 24 && len(cipherKey) != 32 {
		return "", errors.New("invalid encryption key")
	}

	block, err := aes.NewCipher(cipherKey)

	if err != nil {
		return "", err
	}

	cipherText, err := decode(ct)
	if err != nil {
		return "", err
	}

	iv := cipherText[:aes.BlockSize]
	cipherText = cipherText[aes.BlockSize:]

	plainText := make([]byte, len(cipherText))
	cfb := cipher.NewCFBDecrypter(block, iv)
	cfb.XORKeyStream(plainText, cipherText)

	return string(plainText), nil
}

func encode(cipherText []byte) string {
	return base64.StdEncoding.EncodeToString(cipherText)
}

func decode(cipherText string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(cipherText)
}

func getEncryptionKey() string {
	return flag.Lookup("encryption-key").Value.String()
}
