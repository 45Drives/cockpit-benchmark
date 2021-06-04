#!/usr/bin/env python3

"""
    Cockpit Benchmarks - A Storage Benchmark Utility for Cockpit.
    Copyright (C) 2021 Dawson Della Valle <ddellavalle@45drives.com>

    This file is part of Cockpit Benchmarks.

    Cockpit Benchmarks is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Cockpit Benchmarks is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Cockpit Benchmarks.  If not, see <https://www.gnu.org/licenses/>.
"""

from os import path
from optparse import OptionParser

import sys

def main():
    parser = OptionParser()
    (options, args) = parser.parse_args()
    if len(args) < 1:
        print("Not enough arguments!\nexists <path>")
        sys.exit(1)
    
    exists = path.exists(args[0])
    isdir = path.isdir(args[0])

    if exists and isdir:
        print('y')
    else:
        print('n')

if __name__ == "__main__":
    main()
    sys.exit(0)