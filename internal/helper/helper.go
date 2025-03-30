package helper

func DereferString(name *string) string {
	if name != nil {
		return *name
	}
	return ""
}
