@echo off
title Optik Form Lisans Uretici
color 3F
:menu
cls
echo =======================================================
echo          OPTIK FORM UYGULAMASI LISANS YONETICISI
echo =======================================================
echo.
echo    [1] 15 Gunluk Deneme Surumu
echo    [2] 3 Aylik (90 Gun) Lisans
echo    [3] 6 Aylik (180 Gun) Lisans
echo    [4] 1 Yillik (365 Gun) Lisans
echo    [5] Ozel Gun Sayisi Gir
echo.
echo =======================================================
echo.
set /p secim="Seciminiz (1-5): "

if "%secim%"=="1" set days=15 & goto getname
if "%secim%"=="2" set days=90 & goto getname
if "%secim%"=="3" set days=180 & goto getname
if "%secim%"=="4" set days=365 & goto getname
if "%secim%"=="5" goto custom
goto menu

:custom
echo.
set /p days="Lutfen gun sayisini giriniz: "
goto getname

:getname
echo.
set /p owner="Musteri veya Kurum Ismi Giriniz: "
if "%owner%"=="" set owner=IsimsizKullanici
goto generate

:generate
cls
node lisans-olustur.cjs %days% "%owner%"
echo.
echo.
echo Lisans dosyasi basariyla olusturuldu.
echo.
echo Yeni bir lisans uretmek icin bir tusa basin...
pause >nul
goto menu
