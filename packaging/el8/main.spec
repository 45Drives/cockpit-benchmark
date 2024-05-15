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
make

%install
make DESTDIR=%{buildroot} install

%files
/usr/share/cockpit/benchmark/*

%changelog
* Wed May 15 2024 Jordan Keough <jkeough@45drives.com> 2.1.1-1
- Updates dependencies
* Mon Oct 17 2022 Dawson Della Valle <ddellavalle@45drives.com> 2.1.0-2
- Stable release for 2.0 updates
* Fri Sep 02 2022 Jordan Keough <jkeough@45drives.com> 2.0.1-1
- add darkmode
- cleaned up layout
* Thu Sep 01 2022 Jordan Keough <jkeough@45drives.com> 2.0.0-2
- Removed Vue favicon
* Thu Sep 01 2022 Jordan Keough <jkeough@45drives.com> 2.0.0-1
- Reworked plugin with Vue framework
- Fixed downloads in Firefox
* Tue Aug 10 2021 Dawson Della Valle <ddellavalle@45drives.com> 0.2.1-1
- Make content more consistent and clean up page.
* Tue Aug 10 2021 Dawson Della Valle <ddellavalle@45drives.com> 0.2.0-1
- Move to multi-file process.
- Fix delete file issue with fio.
- Officially remove iozone support.
* Fri Jul 02 2021 Dawson Della Valle <ddellavalle@45drives.com> 0.1.0-2
- Build el7 packages.
* Wed Jun 30 2021 Dawson Della Valle <ddellavalle@45drives.com> 0.1.0-1
- Implement fio support.
- Generate bar graphs for data from tools.
- Add export functionality for CSV, XLSX, and ODS.
- Add the auto packaging utility.