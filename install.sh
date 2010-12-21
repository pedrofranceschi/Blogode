#!/bin/sh

# install stuff to build node
apt-get install build-essential libssl-dev python;

# download and compile node
cd /tmp
wget "http://nodejs.org/dist/node-v0.2.5.tar.gz"
tar xzvf node-v0.2.5.tar.gz
cd node-v0.2.5
./configure
make
make install

# install npm (node package manager)
curl http://npmjs.org/install.sh | sh

# install blogode
mkdir /var/www/
cd /var/www/
wget "https://github.com/pedrofranceschi/Blogode/zipball/master"
unzip pedrofranceschi-Blogode-*.zip
rm *.zip
mv pedrofranceschi-Blogode-* blogode/
cd blogode

# install all dependencies
npm install express faye step mysql forever

# sets the default start script for blogode
echo "#!/bin/sh\ncd /var/www/blogode/ && forever start blogode.js" > /usr/bin/start_blogode
chmod +x /usr/bin/start_blogode