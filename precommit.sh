#!/bin/bash

set -e

echo 'formatting code'
./scripts/format-code.sh

echo 'formatting less'
./scripts/format-less.sh

echo 'linting'
./scripts/lint-code.sh