package data

import (
	"strings"

	"github.com/RickinShah/BugBee/internal/validator"
)

type Filters struct {
	Page         int
	PageSize     int
	LastID       int64
	Sort         string
	SortSafeList []string
}

func (f Filters) sortColumn() string {
	for _, safeValue := range f.SortSafeList {
		if f.Sort == safeValue {
			return strings.TrimPrefix(safeValue, "-")
		}
	}
	panic("unsafe sort parameter: " + f.Sort)
}

func (f Filters) sortDirection() string {
	if strings.HasPrefix(f.Sort, "-") {
		return "DESC"
	}
	return "ASC"
}

func ValidateFilters(v *validator.Validator, f Filters) {
	// v.Check(f.Page > 0, "page", "must be greater than zero")
	// v.Check(f.Page <= 10_000_000, "page", "must be maximum of 10 million")
	v.Check(f.PageSize > 0, "page_size", "must be greater than zero")
	v.Check(f.PageSize <= 100, "page_size", "must be maximum of 100")

	v.Check(validator.In(f.Sort, f.SortSafeList...), "sort", "invalid sort value")
}
