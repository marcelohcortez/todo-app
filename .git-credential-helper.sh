if [ "$1" = "get" ]; then
    token=$(gh auth token 2>/dev/null)
    if [ -n "$token" ]; then
        echo "password=$token"
    fi
fi
 EOF
