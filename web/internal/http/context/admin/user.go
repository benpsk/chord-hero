package admin

import "context"

type userKey struct{}

// User represents the authenticated admin principal available in request context.
type User struct {
	ID       int
	Username string
	Role     string
}

// WithUser stores the admin user on the provided context.
func WithUser(ctx context.Context, user User) context.Context {
	return context.WithValue(ctx, userKey{}, user)
}

// FromContext extracts the admin user from context.
func FromContext(ctx context.Context) (User, bool) {
	user, ok := ctx.Value(userKey{}).(User)
	return user, ok
}
