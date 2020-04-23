    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Screenify.
     *  Licensed under the MIT License
     *--------------------------------------------------------------------------------------------*/

    window.onload = function () {
      (function () {


        /**  PointerJs **/
        init_pointer({
          pointerColor: "#42445A"
        })

        /** Snippet Container Background Color */
        let backgroundColor = "#f2f2f2";


        /**  vscode-Api **/
        const vscode = acquireVsCodeApi(),
          oldState = vscode.getState(),

          /** Main Snippet Container **/
          snippetContainerNode = document.getElementById("snippet-container"),

          /** Snippet **/
          snippetNode = document.getElementById("snippet"),

          /** Snap Button **/
          obturateurLogo = document.getElementById("save_logo"),

          /** Drawing Canvas **/
          canvas = document.getElementById('my-canvas'),

          /** Canvas Context **/
          ctx = canvas.getContext('2d'),

          /** Brush icon Tool **/
          brush = document.getElementById("brush"),

          /** Line Tool **/
          line = document.getElementById("line"),

          /** Rectangle Tool **/
          rectangle = document.getElementById("rectangle"),

          /** Snippet Height Text **/
          snippetHeight = document.getElementById("snippetHeight"),

          /** Snippet Width Text **/
          snippetWidth = document.getElementById("snippetWidth"),

          /** Undo Tool **/
          undo = document.getElementById("undo"),

          /** Copy Tool **/
          copyBtn = document.getElementById("copy"),
          /** Upload Tool **/
          upload = document.getElementById("upload"),

          /** Uploaded Url Container **/
          uploadedUrlContainer = document.getElementById("upload-container"),
          clear = document.getElementById("clear");

        /** Changing toolbar color to different color
         * @Note TODO: Update toolbar color to  vscode color theme.  **/
        document.getElementsByClassName("toolbar")[0].style.backgroundColor = "#362b1b";

        /** post message to vscode api, update cache and settings. **/
        vscode.postMessage({
          type: "getAndUpdateCacheAndSettings"
        });

        /** Set @SnippetContainer node opacity to 1 **/
        snippetContainerNode.style.opacity = "1";
        if (oldState && oldState.innerHTML) {
          snippetNode.innerHTML = oldState.innerHTML;
        }

        /**
         * Setup Custom Html with to vscode webview interface wtih font family.
         * @param {String} fontFamily 
         */
        const getInitialHtml = fontFamily => {
          const cameraWithFlashEmoji = String.fromCodePoint(128248);
          const monoFontStack = `${fontFamily},SFMono-Regular,Consolas,DejaVu Sans Mono,Ubuntu Mono,Liberation Mono,Menlo,Courier,monospace`;
          return `<meta charset="utf-8"><div style="color: #d8dee9;background-color: #2e3440; font-family: ${monoFontStack};font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">0. Run command \`Screenify ${cameraWithFlashEmoji}\`</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">1. Copy some code</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">2. Paste into Screenify view</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">3. Click the button ${cameraWithFlashEmoji}</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div></div></div>`;
        };

        /**
         * @function serializeBlob  Converts a blob into serialized blob.
         * @param {Blob} blob 
         * @param {CallBack} cb 
         */
        const serializeBlob = (blob, cb) => {
          const fileReader = new FileReader();

          fileReader.onload = () => {
            const bytes = new Uint8Array(fileReader.result);
            cb(Array.from(bytes).join(","));
          };
          fileReader.readAsArrayBuffer(blob);
        };

        /**
         * @function shoot sends serializedBlob as post request to vscode api to save the blob locally
         * @param {Blob} serializedBlob
         */
        function shoot(serializedBlob) {
          vscode.postMessage({
            type: "shoot",
            data: {
              serializedBlob
            }
          });
        }

        /**
         * @function copy sends serializedBlob as post request to vscode api to either copy the blob to clipboard or updload to CDN
         * @param {Blob} serializedBlob
         * @param {Boolean} upload
         */
        function copy(serializedBlob, upload = false) {
          vscode.postMessage({
            type: "copy",
            data: {
              "serializedBlob": serializedBlob,
              "upload": upload,
            }
          });
        }

        /**
         * @function getBrightness Converts hex color value into rgb value
         * @param {String} hexColor
         */
        function getBrightness(hexColor) {
          const rgb = parseInt(hexColor.slice(1), 16);
          const r = (rgb >> 16) & 0xff;
          const g = (rgb >> 8) & 0xff;
          const b = (rgb >> 0) & 0xff;
          return (r * 299 + g * 587 + b * 114) / 1000;
        }

        /**
         * @function isDark checks if the color is dark
         * @param {String} hexColor
         */
        function isDark(hexColor) {
          return getBrightness(hexColor) < 128;
        }

        /**
         * @function getSnippetBgColor gets snippet color from html string.
         * @param {String} html
         */
        function getSnippetBgColor(html) {
          const match = html.match(/background-color: (#[a-fA-F0-9]+)/);
          return match ? match[1] : undefined;
        }
        /**
         * @function updateEnvironment Updates snippet background color
         * @param {String} snippetBgColor
         */
        function updateEnvironment(snippetBgColor) {
          // update snippet bg color
          document.getElementById("snippet").style.backgroundColor = snippetBgColor;

          // update backdrop color
          if (isDark(snippetBgColor)) {
            snippetContainerNode.style.backgroundColor = "#f2f2f2";
          } else {
            snippetContainerNode.style.background = "none";
          }
        }

        function getMinIndent(code) {
          const arr = code.split("\n");

          let minIndentCount = Number.MAX_VALUE;
          for (let i = 0; i < arr.length; i++) {
            const wsCount = arr[i].search(/\S/);
            if (wsCount !== -1) {
              if (wsCount < minIndentCount) {
                minIndentCount = wsCount;
              }
            }
          }

          return minIndentCount;
        }

        function stripInitialIndent(html, indent) {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const initialSpans = doc.querySelectorAll("div > div span:first-child");
          for (let i = 0; i < initialSpans.length; i++) {
            initialSpans[i].textContent = initialSpans[i].textContent.slice(indent);
          }
          return doc.body.innerHTML;
        }

        document.addEventListener("paste", e => {
          // clear the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const innerHTML = e.clipboardData.getData("text/html");

          const code = e.clipboardData.getData("text/plain");
          const minIndent = getMinIndent(code);

          const snippetBgColor = getSnippetBgColor(innerHTML);
          if (snippetBgColor) {
            vscode.postMessage({
              type: "updateBgColor",
              data: {
                bgColor: snippetBgColor
              }
            });
            updateEnvironment(snippetBgColor);

          }

          if (minIndent !== 0) {
            snippetNode.innerHTML = stripInitialIndent(innerHTML, minIndent);
          } else {
            snippetNode.innerHTML = innerHTML;
          }

          vscode.setState({
            innerHTML
          });
        });

        brush.addEventListener("click", () => {
          changeTool("brush")
        })

        line.addEventListener("click", () => {
          changeTool("line")
        })

        rectangle.addEventListener("click", () => {
          changeTool("rectangle")
        })

        undo.addEventListener("click", () => {
          undoChanges()
        })

        copyBtn.addEventListener("click", () => {
          copyImage()
        })

        upload.addEventListener("click", () => {
          uploadImage()
        })
        clear.addEventListener("click", () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // clear the undo array 
          undo_array = []
          brushPoints = []
          currentState = 0;
          SaveCanvasImage()
          RedrawCanvasImage()
        })


        obturateurLogo.addEventListener("click", () => {
          nippetHandler();
        })

        //  redsize event listener
        const ro = new ResizeObserver((entries, containerName) => {
          for (let entry of entries) {
            const cr = entry.contentRect;
            //Element size: ${cr.width}px x ${cr.height}px`);
            reactToContainerResize(cr.width, cr.height, containerName)
          }
        });

        // // Observe one or multiple elements
        ro.observe(snippetNode);
        // ro.observe(snippetContainerNode)

        function reactToContainerResize(width, height) {

          /** HeightX Width conrdinates Update of the continer **/
          snippetHeight.innerText = Math.floor(new Number(height))
          snippetWidth.innerText = Math.floor(new Number(width))

          /** @NOTE Saving and redrawing canvas is memory hungry I have to design a better solution **/

          /** save the image **/
          SaveCanvasImage()

          /** Update canvas height and width with continer with 20 as margin **/
          canvasHeight = canvas.height = height + 20;
          canvasWidth = canvas.width = width + 20;
          /**  redraw the image **/
          RedrawCanvasImage()
          SaveCanvasImage();
          RedrawCanvasImage()
        }


        function html2blob() {

          /** Multiping the container height and width by 2 make room for scaling for the new canvas **/
          const width = snippetContainerNode.offsetWidth * 2;
          const height = snippetContainerNode.offsetHeight * 2;

          /** Hiding the resizable handle on capture **/
          snippetContainerNode.style.resize = "none";

          /** Changing the snippet container background to transparenet temporary on capture **/
          snippetContainerNode.style.backgroundColor = "transparent";

          /** Scale snippetContainer by 2  temporary on capture **/
          snippetContainerNode.style.transform = "scale(2)";

          /** Canvas Options **/
          const options = {
            removeContainer: true,
            width,
            height,
          }

          return new Promise((resolve, reject) => {
            html2canvas(snippetContainerNode, options).then((canvas) => {
              canvas.toBlob((blob) => {
                if (blob) {

                  /** Reset color **/
                  snippetContainerNode.style.backgroundColor = "#f2f2f2"

                  /** Reset scaling  to previous **/
                  snippetContainerNode.style.transform = "none"

                  /** show resize handle **/
                  snippetContainerNode.style.resize = "";

                  resolve(blob)
                } else reject(new Error("something bad happend"))
              })
            })
          })
        }

        /**
         * Image Shooter function Than 
         * @param {Boolean} copyFlag 
         * @param {Boolean} upload 
         */
        function nippetHandler(copyFlag = false, upload) {
          html2blob()
            .then(blob => {
              serializeBlob(blob, serializedBlob => {

                /** @parem {pa} */
                if (copyFlag) copy(serializedBlob, upload);
                else shoot(serializedBlob);
              });
            })
        }

        let isInAnimation = false;

        /**  Snap btn onhover event listener **/
        obturateurLogo.addEventListener("mouseover", () => {
          if (!isInAnimation) {
            isInAnimation = true;

            new Vivus(
              "save_logo", {
                duration: 40,
                onReady: () => {
                  obturateurLogo.className = "obturateur filling";
                }
              },
              () => {
                setTimeout(() => {
                  isInAnimation = false;
                  obturateurLogo.className = "obturateur";
                }, 700);
              }
            );
          }
        });

        window.addEventListener("message", e => {
          if (e) {
            if (e.data.type === "init") {
              const {
                fontFamily,
                bgColor
              } = e.data;

              const initialHtml = getInitialHtml(fontFamily);
              snippetNode.innerHTML = initialHtml;
              vscode.setState({
                innerHTML: initialHtml
              });

              // update backdrop color, using bgColor from last pasted snippet
              // cannot deduce from initialHtml since it's always using Nord color
              if (isDark(bgColor)) {
                snippetContainerNode.style.backgroundColor = "#f2f2f2";
              } else {
                snippetContainerNode.style.background = "none";
              }
            } else if (e.data.type === "successfulUplaod") {
              uploadedUrlContainer.innerHTML =
                `
               <div class="card" style="align-items:center">
                <div class="card-body">
                 <input style="align-self:center;" type = "text"
                value = "${e.data.url}" >
                 <button class="btn" data-clipboard-target="#foo">
                     <img src="https://img.icons8.com/pastel-glyph/24/000000/clipboard--v1.png" alt="Copy to clipboard">
                    </button>
                </div>
              </div>   
              `
            } else if (e.data.type === "update") {
              document.execCommand("paste");
            } else if (e.data.type === "restore") {
              snippetNode.innerHTML = e.data.innerHTML;
              updateEnvironment(e.data.bgColor);
            } else if (e.data.type === "restoreBgColor") {
              updateEnvironment(e.data.bgColor);
            } else if (e.data.type === "updateSettings") {
              snippetNode.style.boxShadow = e.data.shadow;
              target = e.data.target;
              transparentBackground = e.data.transparentBackground;
              snippetContainerNode.style.backgroundColor = e.data.backgroundColor;
              backgroundColor = e.data.backgroundColor;
              if (e.data.ligature) {
                snippetNode.style.fontVariantLigatures = "normal";
              } else {
                snippetNode.style.fontVariantLigatures = "none";
              }

            }
          }
        });
        window.addEventListener("keypress", ReactToKeyup)
        window.addEventListener("keyup", ReactToKeyup)

        function ReactToKeyup(event) {
          // CTRL + S || cmd + S keypress
          if (event.which == 115 && (event.ctrlKey || event.metaKey) || (event.which == 19)) {
            event.preventDefault();
            nippetHandler();
            // CTRL + Z || cmd + Z keyboard keypress
          } else if (event.which == 90 && (event.ctrlKey || event.metaKey) || (event.which == 19)) {
            // event.preventDefault();
            undoChanges()
          } else if (event.which == 67 && (event.ctrlKey || event.metaKey) || (event.which == 19)) {
            copyImage()
          }
        }

        /**
         *                   PaintJS
         * JavaScript Paint App JavaScript Canvas API
         */

        let savedImageData;
        // Stores whether I'm currently dragging the mouse or not
        let dragging = false;
        let strokeColor = 'black';
        let fillColor = 'black';
        let line_Width = 1;
        // Tool currently using
        let currentTool = 'brush';
        /** Changed canvas 's height and width to the innerheight of snippetnode. */

        let canvasWidth = snippetContainerNode.clientWidth + 20;
        let canvasHeight = snippetContainerNode.clientHeight + 20;

        // Stores whether I'm currently using brush
        let usingBrush = false;
        // Stores whether mouse coordinat
        let brushPoints = new Array();
        // Stores the history of canvas data
        let undo_array = new Array();
        //  pointer to keep track of undo steps in canvas
        let currentState = 0;

        // Stores size data used to create rubber band shapes
        // that will redraw as the user moves the mouse
        class ShapeBoundingBox {
          constructor(left, top, width, height) {
            this.left = left;
            this.top = top;
            this.width = width;
            this.height = height;
          }
        }

        // Holds x & y position where clicked
        class MouseDownPos {
          constructor(x, y) {
            this.x = x,
              this.y = y;
          }
        }

        // Holds x & y location of the mouse
        class Location {
          constructor(x, y) {
            this.x = x,
              this.y = y;
          }
        }

        // Stores top left x & y and size of rubber band box 
        let shapeBoundingBox = new ShapeBoundingBox(0, 0, 0, 0);

        // Holds x & y position where clicked
        let mousedown = new MouseDownPos(0, 0);

        // Holds x & y location of the mouse
        let loc = new Location(0, 0);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = line_Width;

        // Execute ReactToMouseDown when the mouse is clicked
        canvas.addEventListener("mousedown", ReactToMouseDown);
        // Execute ReactToMouseMove when the mouse is clicked
        canvas.addEventListener("mousemove", ReactToMouseMove);
        // Execute ReactToMouseUp when the mouse is clicked
        canvas.addEventListener("mouseup", ReactToMouseUp);
        //  }

        function changeTool(toolClicked) {
          document.getElementById("brush").className = "";
          document.getElementById("line").className = "";
          document.getElementById("rectangle").className = "";
          // Highlight the last selected tool on toolbar
          document.getElementById(toolClicked).className = "selected";
          // Change current tool used for drawing
          currentTool = toolClicked;
        }

        // Returns mouse x & y position based on canvas position in page
        function GetMousePosition(x, y) {
          // Get canvas size and position in web page
          let canvasSizeData = canvas.getBoundingClientRect();
          return {
            x: (x - canvasSizeData.left) * (canvas.width / canvasSizeData.width),
            y: (y - canvasSizeData.top) * (canvas.height / canvasSizeData.height)
          };
        }


        function SaveCanvasImage() {
          if (currentState != undo_array.length - 1) {
            undo_array.splice(currentState + 1, undo_array.length);
          }
          savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          undo_array.push({
            currentTool,
            savedImageData
          })
          currentState++
        }

        function RedrawCanvasImage() {
          if (savedImageData) ctx.putImageData(savedImageData, 0, 0);
          // added this to cancel the bug of intial state
          else {
            SaveCanvasImage()
            RedrawCanvasImage()
          }

        }

        function UpdateRubberbandBoxSizeData(loc) {
          // Height & width are the difference between were clicked
          // and current mouse position
          shapeBoundingBox.width = Math.abs(loc.x - mousedown.x);
          shapeBoundingBox.height = Math.abs(loc.y - mousedown.y);

          // If mouse is below where mouse was clicked originally
          if (loc.x > mousedown.x) {

            // Store mousedown because it is farthest left
            shapeBoundingBox.left = mousedown.x;
          } else {

            // Store mouse location because it is most left
            shapeBoundingBox.left = loc.x;
          }

          // If mouse location is below where clicked originally
          if (loc.y > mousedown.y) {

            // Store mousedown because it is closer to the top
            // of the canvas
            shapeBoundingBox.top = mousedown.y;
          } else {

            // Otherwise store mouse position
            shapeBoundingBox.top = loc.y;
          }
        }


        // Called to draw the line
        function drawRubberbandShape(loc) {

          ctx.strokeStyle = strokeColor;
          ctx.fillStyle = fillColor;
          if (currentTool === "brush") {
            // Create paint brush
            DrawBrush();
          } else if (currentTool === "line") {
            // Draw Line
            ctx.beginPath();
            ctx.moveTo(mousedown.x, mousedown.y);
            ctx.lineTo(loc.x, loc.y);
            ctx.stroke();
          } else if (currentTool === "rectangle") {
            // Creates rectangles
            ctx.strokeRect(shapeBoundingBox.left, shapeBoundingBox.top, shapeBoundingBox.width, shapeBoundingBox.height);
          }
        }

        function UpdateRubberbandBoxOnMove(loc) {
          // Stores changing height, width, x & y position of most 
          // top left point being either the click or mouse location
          UpdateRubberbandBoxSizeData(loc);

          // Redraw the shape
          drawRubberbandShape(loc);
        }

        // Store each point as the mouse moves and whether the mouse
        // button is currently being dragged
        function AddBrushPoint(x, y, mouseDown, brushColor, brushSize, mode = none, tool) {

          let point = {
            tool: tool,
            "x": x,
            "y": y,
            "isDrawing": mouseDown,
            size: brushSize,
            color: brushColor,
            mode: mode
          }
          brushPoints.push(point)
        }

        // Cycle through all brush points and connect them with lines
        function DrawBrush() {
          if (brushPoints.length == 0) {
            return;
          }

          for (var i = 0; i < brushPoints.length; i++) {
            let pt = brushPoints[i];
            let begin = false;
            ctx.strokeStyle = pt.color
            if (pt.mode == "begin" || begin) {
              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
            }
            ctx.lineTo(pt.x, pt.y);
            if (pt.mode == "end") {
              ctx.stroke();
            }
          }
          ctx.stroke();
        }

        function ReactToMouseDown(e) {
          // Change the mouse pointer to a crosshair
          canvas.style.cursor = "crosshair";

          // Store location 
          loc = GetMousePosition(e.clientX, e.clientY);

          // Store mouse position when clicked
          mousedown.x = loc.x;
          mousedown.y = loc.y;
          // Store that yes the mouse is being held down
          dragging = true;

          // Brush will store points in an array
          if (currentTool === 'brush') {
            usingBrush = true;
            AddBrushPoint(loc.x, loc.y, mouseDown = false, brushColor = strokeColor, brushSize = line_Width, mode = "begin");
          }
        };

        function ReactToMouseMove(e) {
          canvas.style.cursor = "crosshair"
          loc = GetMousePosition(e.clientX, e.clientY);

          // If using brush tool and dragging store each point
          if (currentTool === 'brush' && dragging && usingBrush) {
            if (loc.x > 0 && loc.x < canvasWidth && loc.y > 0 && loc.y < canvasHeight) {
              ctx.lineTo(loc.x, loc.y);
              ctx.stroke();
              AddBrushPoint(loc.x, loc.y, mouseDown = true, brushColor = strokeColor, brushSize = line_Width, mode = "draw");
            }
            RedrawCanvasImage();
            DrawBrush();
          } else {
            if (dragging) {
              RedrawCanvasImage();
              UpdateRubberbandBoxOnMove(loc);
            }

          }
        };

        function ReactToMouseUp(e) {
          SaveCanvasImage()
          if (currentTool === "brush") AddBrushPoint(loc.x, loc.y, mouseDown = false, brushColor = fillColor, brushSize = line_Width, mode = "end");

          canvas.style.cursor = "defualt";
          loc = GetMousePosition(e.clientX, e.clientY);
          dragging = false;
          RedrawCanvasImage();
          UpdateRubberbandBoxOnMove(loc);
          usingBrush = false;

        }


        // restores the previos state of canvas.

        function restoreState() {
          if (!undo_array.length || currentState <= 0) return;

          restore_state = undo_array[--currentState]
          if (restore_state.currentTool === "brush") {
            deleteLastBrushPoint()
            DrawBrush()
          }
          savedImageData = restore_state.savedImageData
          RedrawCanvasImage()
        }

        function deleteLastBrushPoint() {
          brushPoints.forEach((end, i) => {
            if (end.mode === "begin") {
              return brushPoints.splice(i, brushPoints.length)
            }
          })
        }

        /** undo function **/
        function undoChanges() {
          restoreState()
        }
        /**
         * Copy image command
         * @param {Boolean} upload 
         */
        function copyImage(upload = false) {
          nippetHandler(copyFlag = true, upload);
        }

        function uploadImage() {
          copyImage(true)
        }

        const pickr = Pickr.create({
          el: '#pickr',
          theme: 'nano', // or 'classic', or 'nano'

          swatches: [
            'rgba(244, 67, 54, 1)',
            'rgba(233, 30, 99, 0.95)',
            'rgba(156, 39, 176, 0.9)',
            'rgba(103, 58, 183, 0.85)',
            'rgba(63, 81, 181, 0.8)',
            'rgba(33, 150, 243, 0.75)',
            'rgba(3, 169, 244, 0.7)',
            'rgba(0, 188, 212, 0.7)',
            'rgba(0, 150, 136, 0.75)',
            'rgba(76, 175, 80, 0.8)',
            'rgba(139, 195, 74, 0.85)',
            'rgba(205, 220, 57, 0.9)',
            'rgba(255, 235, 59, 0.95)',
            'rgba(255, 193, 7, 1)'
          ],

          components: {

            // Main components
            preview: true,
            opacity: true,
            hue: true,
          }
        });
        pickr.on('init', (instance) => {
          const hexColor = color.toHEXA().toString();
          fillColor = strokeColor = hexColor

        });
        pickr.on('change', (color, instance) => {
          const hexColor = color.toHEXA().toString();
          fillColor = strokeColor = hexColor

          /**  PointerJs **/
          init_pointer({
            pointerColor: hexColor,
          })
        })

        /**
         * Redo feature
         */
        // 
      })
      ();
    }