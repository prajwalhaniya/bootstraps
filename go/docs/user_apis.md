# APIs

#### Create User

```
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-123" \
  -d '{
        "name": "John Doe",
        "email": "john@example.com"
      }'

```

#### Get user by Id

```
curl -X GET http://localhost:8080/api/users/1 \
  -H "X-Request-ID: test-123"
```

#### Get user by email

```
curl -G http://localhost:8080/api/users/email/john@example.com \
  -H "X-Request-ID: test-123"
```


