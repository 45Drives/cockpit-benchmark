all:

install:
	mkdir -p $(DESTDIR)/usr/share/cockpit/benchmark
	cp -r benchmark/* $(DESTDIR)/usr/share/cockpit/benchmark

uninstall:
	rm -rf $(DESTDIR)/usr/share/cockpit/benchmark