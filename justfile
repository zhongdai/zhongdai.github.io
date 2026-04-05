# Build the static site
build:
    uv run build.py

# Validate all links for dead URLs
validate:
    uv run validate.py

# Run tests
test:
    uv run pytest tests/ -v

# Preview the site locally
preview:
    uv run build.py
    open docs/index.html

# Build and push to GitHub
push: build
    git add -A
    git commit -m "update site"
    git push

# Add a new entry interactively
add name:
    @echo "url: " > entries/{{name}}.yaml
    @echo "title: " >> entries/{{name}}.yaml
    @echo "description: " >> entries/{{name}}.yaml
    @echo "tags:" >> entries/{{name}}.yaml
    @echo "  - " >> entries/{{name}}.yaml
    @echo "date: $(date +%Y-%m-%d)" >> entries/{{name}}.yaml
    @echo "Created entries/{{name}}.yaml — edit it to fill in the details"
