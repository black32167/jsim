FROM httpd:2.4
COPY ./*.html /usr/local/apache2/htdocs/
COPY ./js/ /usr/local/apache2/htdocs/js
COPY ./css/ /usr/local/apache2/htdocs/css
COPY ./httpd.conf /usr/local/apache2/conf/httpd.conf