﻿using Scriban;
using Scriban.Parsing;
using Scriban.Runtime;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Web;

namespace PainterPro
{
	public static class Website
	{
		public static List<DrawRequest> drawRequests = new List<DrawRequest>();
		public static Route[] routes =
		{
			new Route("payment", new string[] { "POST" }, async (context) =>
			{
				Dictionary<string, object>? fields = context.ReadPost();
				if (fields == null)
				{
					return;
				}
				DrawRequest drawRequest = new DrawRequest(fields);
				if (drawRequest.pixels.Count <= 0)
				{
					context.Send(422, "Unprocessable Entity", "The pixel drawing request is missing fields.");
					return;
				}
				drawRequests.Add(drawRequest);
				context.Response.SetCookie(new Cookie("DrawRequestUuid", drawRequest.uuid, "/qr/"));
				HttpResponseMessage? swishResponse = await drawRequest.CreatePaymentRequest();
				MyConsole.WriteTimestamp();
				if (swishResponse == null)
				{
					context.Send(504, "Gateway Timeout", "Failed to get response from Swish servers.");
					return;
				}
				MyConsole.Write(" Swish response:");
				MyConsole.SetStatusColor(swishResponse.IsSuccessStatusCode);
				MyConsole.WriteMany((int)swishResponse.StatusCode, swishResponse.StatusCode);
				if (swishResponse.Content != null)
				{
					MyConsole.WriteData("	Response Body", await swishResponse.Content.ReadAsStringAsync());
				}

				if (!swishResponse.IsSuccessStatusCode)
				{
					string responseString = await swishResponse.Content.ReadAsStringAsync();
					Dictionary<string, string>[]? errors = JsonSerializer.Deserialize<Dictionary<string, string>[]>(responseString);
					context.Send(502, "Bad Gateway", "Received a \"" + (int)swishResponse.StatusCode + ": " + swishResponse.StatusCode.ToString() + "\" error response from Swish servers.", errors);
				}

				MyConsole.color = ConsoleColor.Blue;
				MyConsole.Write(" Client response:");
				context.SendHtmlFile("pages\\payment.html");
			}),
			new Route("qr", new string[] { "GET" }, async (context) =>
			{
				// Sends regular files.
				context.Response.ContentType = "image/png";
				context.Response.AddHeader("Content-Disposition", "inline; filename = \"swishQrCode.png\"");

				MyConsole.WriteData("Cookie", context.Request.Cookies["OtherCookie"]);
				Cookie? cookie = context.Request.Cookies["DrawRequestUuid"];
				if (cookie == null)
				{
					context.Send(400, "Bad Request", "The request is missing a \"DrawRequestUuid\" cookie.");
					return;
				}
				DrawRequest? drawRequest = drawRequests.Find(drawRequest => drawRequest.uuid == cookie.Value);
				if (drawRequest == null)
				{
					context.Send(404, "Not Found", "There currently is no draw request with the uuid \"" + cookie.Value + "\"");
					return;
				}

				using (Stream imageStream = await drawRequest.GetPaymentQrStream())
				{
					context.Response.ContentLength64 = imageStream.Length;
					imageStream.CopyTo(context.Response.OutputStream);
				}
				MyConsole.WriteHttpStatus(context);
				context.Response.Close();
			}),
			new Route("update", new string[] { "POST" }, (context) =>
			{
				Dictionary<string, object>? fields = context.ReadPost();
				if (fields == null)
				{
					return;
				}
				if (fields.Count <= 0)
				{
					fields.Add("text", "Hello?");
				}
				context.SendJson(fields);
			}),
			new Route("swish", new string[] { "POST"}, (context) =>
			{
				// TODO: IP filtering.
				Dictionary<string, object> fields = context.ReadPost();
				if (fields == null)
				{
					return;
				}
				context.Send(204, "No Content", "Thank you, friendly swish servers.");
			})
		};

		public static async void HandleConnection(this HttpListenerContext context)
		{
			MyConsole.WriteTimestamp();
			MyConsole.WriteMany(context.Request.RemoteEndPoint, "Connection:");
			MyConsole.color = ConsoleColor.DarkYellow;
			MyConsole.WriteMany(context.Request.HttpMethod, context.Request.Url);
			context.Response.ContentEncoding = Encoding.UTF8;

			if (context.Request.Url == null)
			{
				context.Send(400, "Bad Request", "No requested URL was specified.");
				return;
			}

			// The preferred path to be used.
			string shortPath = context.Request.Url.LocalPath.Trim('/').Replace(".html", null).Replace("index", null, true, null);

			// Checks if the url path matches a pre-defined path.
			string basePath = shortPath.Split('/', 2)[0];
			foreach (Route route in routes)
			{
				if (route.name == basePath)
				{
					foreach (string method in route.methods)
					{
						if (method == context.Request.HttpMethod.ToUpper())
						{
							context.SetPreferredRedirect(shortPath.TrimEnd('/') + "/");
							route.Action(context);
							return;
						}
					}
					context.Send(405, "Method Not Allowed", "The route \"" + context.Request.Url.LocalPath + "\" only accepts " + Util.GrammaticalListing(route.methods) + " requests.");
					return;
				}
			}

			string convertedPath = shortPath.Replace('/', '\\'); // The url path as a relative windows file path.

			// Checks if the url path matches an asset file name.
			if (File.Exists(Path.Combine(Util.currentDirectory, "assets\\", convertedPath)))
			{
				if (context.Request.HttpMethod.ToUpper() != "GET")
				{
					context.Send(405, "Method Not Allowed", "The file at \"" + context.Request.Url.LocalPath + "\" is static and can only be loaded with GET requests.");
					return;
				}
				context.SetPreferredRedirect(shortPath);
				context.SendFile("assets\\" + convertedPath);
				return;
			}

			// Checks if the url path matches a html file name.
			foreach (string pathAlternative in new string[] { convertedPath + ".html", Path.Combine(convertedPath, "index.html") })
			{
				if (File.Exists(Path.Combine(Util.currentDirectory, "pages\\", pathAlternative)))
				{
					if (context.Request.HttpMethod.ToUpper() != "GET")
					{
						context.Send(405, "Method Not Allowed", "The page at \"" + context.Request.Url.LocalPath + "\" is static and can only be loaded with GET requests.");
						return;
					}
					context.SetPreferredRedirect(shortPath + "/");
					context.SendHtmlFile("pages\\" + pathAlternative);
					return;
				}
			}
			context.Send(404, "Not Found", "The requested file \"" + shortPath + "\" could not be found.");
			//context.Send(418, "I'm a teapot", "And I can't be asked to brew coffee.");
		}

		public static void SetPreferredRedirect(this HttpListenerContext context, string shortPath)
		{
			string path = "/" + shortPath.TrimStart('/');
			if (context.Request.Url != null && path != context.Request.Url.LocalPath)
			{
				context.Response.StatusCode = 300;
				context.Response.StatusDescription = "Multiple Choices";
				context.Response.RedirectLocation = path;
			}
		}

		public static Dictionary<string, object>? ReadPost(this HttpListenerContext context)
		{
			if (context.Request.ContentLength64 <= 0)
			{
				return null;
			}
			string text;
			using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
			{
				text = reader.ReadToEnd();
			}

			MyConsole.WriteData("	Received data", text);
			Dictionary<string, object>? fields = null;
			switch (context.Request.ContentType)
			{
				case "application/x-www-form-urlencoded":
					fields = new Dictionary<string, object>();
					string[] rawFields = text.Split('&');
					foreach (string rawField in rawFields)
					{
						string[] pair = rawField.Split('=', 2);
						if (pair.Length == 2)
						{
							string key = pair[0];
							string value = HttpUtility.UrlDecode(pair[1]);
							if (!fields.ContainsKey(key))
							{
								fields.Add(key, value);
							}
						}
					}
					if (fields.Count() <= 0)
					{
						return null;
					}
					break;
				case "application/json":
					try
					{
						fields = JsonSerializer.Deserialize<Dictionary<string, object>>(text);
						break;
					}
					catch (JsonException exception)
					{
						context.Send(422, "Unprocessable Entity", "An exception occured when deserializing the received json: " + exception.Message);
						return null;
					}
				case null:
					context.Send(400, "Bad Request", "The server could not process the request because it was malformed, the header field \"ContentType\" is missing.");
					return null;
				default:
					context.Send(415, "Unsupported Media Type", "The server currently only accepts content encoded with either \"application/x-www-form-urlencoded\" or \"application/json\".");
					return null;
			}
			if (fields == null)
			{
				context.Send(500, "Internal Server Error", "Something went wrong when deserializing the POST contents.");
			}
			return fields;
		}

		public static void SendFile(this HttpListenerContext context, string relativePath) // TODO: Add more broad serach for missing files.
		{
			string absolutePath = Path.Combine(Util.currentDirectory, relativePath);

			// Sends regular files.
			context.Response.ContentType = MimeTypes.GetMimeType(absolutePath);
			context.Response.AddHeader("Content-Disposition", "inline; filename = \"" + Path.GetFileName(absolutePath) + "\"");
			context.Response.ContentLength64 = new FileInfo(absolutePath).Length;
			try
			{
				using (Stream fileStream = File.OpenRead(absolutePath))
				{
					fileStream.CopyTo(context.Response.OutputStream);
				}
			}
			catch (IOException)
			{
				context.Send(503, "Service Unavailable", "The server encountered a temporary error when reading \"" + relativePath + "\".");
				return;
			}

			MyConsole.WriteHttpStatus(context);
			context.Response.Close();
		}

		public static void SendHtmlFile(this HttpListenerContext context, string relativePath, Dictionary<string, object>? parameters = null) // TODO: Add error handling for scriban syntax errors.
		{
			string absolutePath = Path.Combine(Util.currentDirectory, relativePath);
			context.Response.AddHeader("Content-Disposition", "inline; filename = \"" + Path.GetFileName(absolutePath) + "\"");

			ScriptObject script = new ScriptObject(); // Used for sending arguments to html template.
			if (parameters != null)
			{
				foreach (KeyValuePair<string, object> parameter in parameters)
				{
					script.Add(parameter.Key, parameter.Value);
				}
			}
			TemplateContext templateContext = new TemplateContext();
			templateContext.TemplateLoader = new MyTemplateLoader();
			templateContext.PushGlobal(script);

			Template template = Template.Parse(File.ReadAllText(absolutePath, Encoding.UTF8));
			context.SendBody(template.Render(templateContext));
			context.Response.Close();
		}

		public static void SendJson(this HttpListenerContext context, Dictionary<string, object> fields)
		{
			context.SendBody(JsonSerializer.Serialize(fields), "application/json");
		}

		public static void Send(this HttpListenerContext context, int code, string message, string? body = null, Dictionary<string, string>[]? errors = null)
		{
			context.Response.StatusCode = code;
			context.Response.StatusDescription = message;
			Dictionary<string, object>? parameters = new Dictionary<string, object>()
			{
				{ "code", code.ToString() },
				{ "message", message }
			};
			if (errors != null)
			{
				parameters.Add("errors", errors);
			}
			if (body != null)
			{
				parameters.Add("body", body);
			}
			try
			{
				context.SendHtmlFile("pages/error.html", parameters);
			}
			catch (Exception exception)
			{
				MyConsole.Write("\r\nException during html generation:\r\n");
				MyConsole.color = ConsoleColor.White;
				MyConsole.Write(exception);
				context.SendBody("<html><body><h1>" + code.ToString() + ": " + message + "</h1><hr><p>" + body + "</p><h2>An additional Internal Server Error occurred</h2><p style=\"white-space: pre-wrap;\">" + HttpUtility.HtmlEncode(exception) + "</p></body></html>");
			}
		}

		public static void SendBody(this HttpListenerContext context, string body, string type = "text/html")
		{
			context.SendBody(Encoding.UTF8.GetBytes(body), type);
		}
		public static void SendBody(this HttpListenerContext context, byte[] bytes, string type = "text/html")
		{
			context.Response.ContentLength64 = bytes.Length;
			context.Response.ContentType = type;

			context.Response.OutputStream.Write(bytes);
			MyConsole.WriteHttpStatus(context);
			context.Response.Close();
		}

		public static void SendRedirect(this HttpListenerContext context, string location, int code, string message = "")
		{
			context.Response.StatusCode = code;
			context.Response.StatusDescription = message;
			context.Response.RedirectLocation = location;

			MyConsole.WriteHttpStatus(context);
			context.Response.Close();
		}

		public class Route
		{
			public string name;
			public string[] methods;
			public Action<HttpListenerContext> Action;

			public Route(string routeName, string[] routeMethods, Action<HttpListenerContext> RouteAction)
			{
				name = routeName;
				methods = routeMethods;
				Action = RouteAction;
			}
		}
		public class MyTemplateLoader : ITemplateLoader
		{
			public string GetPath(TemplateContext context, SourceSpan callerSpan, string templateName) // TODO: Adapt for relative paths.
			{
				return Path.Combine(Util.currentDirectory, templateName.Replace('/', '\\').TrimStart('\\'));
			}

			public string Load(TemplateContext context, SourceSpan callerSpan, string templatePath)
			{
				return File.ReadAllText(templatePath, Encoding.UTF8);
			}

			public ValueTask<string> LoadAsync(TemplateContext context, SourceSpan callerSpan, string templatePath)
			{
				throw new NotImplementedException();
			}
		}
	}
}