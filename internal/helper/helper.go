package helper

func DereferString(name *string) string {
	if name != nil {
		return *name
	}
	return ""
}

func ToStringPointer(name string) *string {
	if name == "" {
		return nil
	}
	return &name
}
