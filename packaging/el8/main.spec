Name: ::package_name::
Version: ::package_version::
Release: ::package_build_version::%{?dist}
Summary: ::package_description_short::
License: ::package_licence::
URL: ::package_url::
Source0: %{name}-%{version}.tar.gz
BuildArch: ::package_architecture_el::
Requires: ::package_dependencies_el::

BuildRoot: %{_tmppath}/%{name}-%{version}-%{release}-root

%description
::package_title::
::package_description_long::

%prep
%setup -q

%build

%install
make DESTDIR=%{buildroot} install

%files
/usr/share/cockpit/benchmark/*

%changelog
* Wed Jun 30 2021 Dawson Della Valle <ddellavalle@45drives.com> 0.1.0-1
- Implement fio support
- Generate bar graphs for data from tools.
- Add export functionality for CSV, XLSX, and ODS.
- Add the auto packaging utility.