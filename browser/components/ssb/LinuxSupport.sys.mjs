export const EXPORTED_SYMBOLS = ["LinuxSupport"];

const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);

const { SiteSpecificBrowserIdUtils } = ChromeUtils.import(
  "resource:///modules/SiteSpecificBrowserIdUtils.jsm"
);

const lazy = {};
XPCOMUtils.defineLazyModuleGetters(lazy, {
  ImageTools: "resource:///modules/ssb/ImageTools.jsm",
});

const File = Components.Constructor(
  "@mozilla.org/file/local;1",
  Ci.nsIFile,
  "initWithPath",
);

export const LinuxSupport = {
  /**
   * Installs an SSB by creating a .desktop file to launch it.
   *
   * @param {SiteSpecificBrowser} ssb the SSB to install.
   */
  async install(ssb) {

    let dir = PathUtils.join(PathUtils.profileDir, "ssb", ssb.id);
    await IOUtils.makeDirectory(dir, {
      from: PathUtils.profileDir,
      ignoreExisting: true,
    });

    let iconFile = new File(PathUtils.join(dir, "icon.png"));
    let icon = await SiteSpecificBrowserIdUtils.getIconBySSBId(ssb.id, 128);
    if (icon) {
      let { container } = await lazy.ImageTools.loadImage(
        Services.io.newURI(icon.src)
      );
      lazy.ImageTools.saveIcon(container, 128, 128, iconFile);
    } else {
      // TODO use a default icon file.
      iconFile = null;
    }

    let applicationDir = "~/.local/share/applications";
    let desktopFile = PathUtils.join(
      applicationDir,
      `floorp-${ssb.name}-${ssb.id}.desktop`
    );
    await IOUtils.write(
      desktopFile,
      new TextEncoder().encode(
        `[Desktop Entry]
Type=Application
Terminal=false
Name=${ssb.name}
Exec=/usr/bin/floorp --profile "${PathUtils.profileDir}" --start-ssb "${ssb.id}"
Icon=${iconFile.path}`
      )
    );
  },

  /**
   * Uninstalls an SSB by removing the .desktop file.
   *
   * @param {SiteSpecificBrowser} ssb the SSB to uninstall.
   */
  async uninstall(ssb) {

    try {
      let applicationDir = "~/.local/share/applications";
      let desktopFile = PathUtils.join(
        applicationDir,
        `floorp-${ssb.name}-${ssb.id}.desktop`
      );
      await IOUtils.remove(desktopFile);
    } catch (e) {
      console.error(e);
    }

    let dir = PathUtils.join(PathUtils.profileDir, "ssb", ssb.id);
    try {
      await IOUtils.remove(dir, { recursive: true });
    } catch (e) {
      console.error(e);
    }
  },
};
