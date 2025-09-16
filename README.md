# Cockpit Benchmark

A Visual Storage Benchmark Utility for Cockpit that lets you run quick storage benchmarks with fio, visualize results, and export a shareable report. It’s designed for day-to-day validation and sanity checks on test paths (single disk, RAID, pools, mounts, etc.) directly from your browser.

## Features

* Three benchmark modes

  * Max Throughput (1M record size, bandwidth-oriented)

  * Max IOPS (4k record size, ops-oriented)

  * Performance Spectrum (4k → 1M sweep)

* Workloads covered: sequential Reads/Writes and random Reads/Writes

* Progress feedback with live percentage and status text

* Interactive bar chart: toggle between IOPS and Bandwidth

* Downloadable reports in XLSX, CSV, or ODS

* Input validation for runtime, file size, and test path existence

* Least-privilege execution via Cockpit’s privilege escalation when needed

## Installation

* From packages
  * If your platform includes a packaged build of this plugin, install it through your standard package manager and open Cockpit → Benchmarks.


## Usage

* Open Cockpit → Benchmarks.

* Choose Benchmark Type:

  * Max Throughput (1M block size, Bandwidth chart default)

  * Max IOPS (4k block size, IOPS chart default)

  * Performance Spectrum (4k → 1M sweep)

* Set parameters:

  * File Size and Unit (MiB/GiB)

  * IO Depth (1–128)

  * Runtime (seconds; excludes 5-second ramp time)

  * Test Path (must exist; e.g., /mnt/hdd or a dataset/mount)

* Click Launch. A progress bar displays status until completion.

* Toggle Chart Output between IOPS and Bandwidth as needed.

* Click Download Report to save results as XLSX, CSV, or ODS.