package shared

const (
	// DefaultPage is the fallback page index for list endpoints.
	DefaultPage = 1
	// DefaultPerPage sets the standard page size when none is provided.
	DefaultPerPage = 10
	// MaxPerPage caps client supplied page sizes to protect the database.
	MaxPerPage = 100
)

// NormalisePage coerces the incoming page to a positive integer.
func NormalisePage(page int) int {
	if page > 0 {
		return page
	}
	return DefaultPage
}

// NormalisePerPage ensures the page size stays within acceptable bounds.
func NormalisePerPage(perPage int) int {
	if perPage <= 0 {
		return DefaultPerPage
	}
	if perPage > MaxPerPage {
		return MaxPerPage
	}
	return perPage
}

// Offset returns the starting row index for the given page configuration.
func Offset(page, perPage int) int {
	if page <= 1 {
		return 0
	}
	return (page - 1) * perPage
}
