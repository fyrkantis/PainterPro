using Scriban;
using Scriban.Parsing;
using Scriban.Runtime;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Web;

namespace PainterPro
{
	public static class MyConsole
	{
		public static void WriteTimestamp()
		{
			Console.ForegroundColor = ConsoleColor.White;
			Console.Write("\r\n" + DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.ff"));
			Console.ForegroundColor = ConsoleColor.Blue;
		}

		public static void WriteData(string name, string data)
		{
			Console.ForegroundColor = ConsoleColor.White;
			Console.Write("\r\n" + name + ": ");
			Console.ForegroundColor = ConsoleColor.Magenta;
			Console.Write(data);
		}

		public static void WriteMany(params object?[] elements)
		{
			foreach (object? element in elements)
			{
				if (element != null)
				{
					Console.Write(" " + element.ToString());
				}
			}
		}
	}

	public static class Website
	{
		public static string currentDirectory = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName;
		public static Dictionary<string, string> appsettings = JsonSerializer.Deserialize<Dictionary<string, string>>(File.OpenRead(currentDirectory + "\\appsettings.json"));
		public static X509Certificate2Collection certificates = new X509Certificate2Collection()
		{
			//new X509Certificate2(currentDirectory + "\\certificates\\Swish\\Swish_Merchant_TestCertificate_1234679304.key", "swish"),
			new X509Certificate2(currentDirectory + "\\certificates\\Swish\\Swish_Merchant_TestCertificate_1234679304.p12", "swish"),
			new X509Certificate2(currentDirectory + "\\certificates\\Swish\\Swish_Merchant_TestCertificate_1234679304.pem", "swish")
		};

		public static Dictionary<int, DrawRequest> drawRequests = new Dictionary<int, DrawRequest>();

		public static async void HandleConnection(this HttpListenerContext context)
		{
			HttpListenerRequest request = context.Request;
			MyConsole.WriteTimestamp(); // TODO: Log sender IP.
			Console.Write(" Connection:");
			Console.ForegroundColor = ConsoleColor.DarkYellow;
			MyConsole.WriteMany(request.HttpMethod, request.Url);
			HttpListenerResponse response = context.Response;
			response.ContentEncoding = Encoding.UTF8;

			if (request.HttpMethod.ToLower() == "post")
			{
				await HandlePostAsync(request, response);
				return;
			}

			if (request.Url == null)
			{
				response.Send(400, "Bad Request", "No requested URL was specified.");
				return;
			}
			if (request.Url.LocalPath == "/index.html")
			{
				response.SendRedirect("/", 308, "Permanent Redirect");
				return;
			}

			SendFile(response, request.Url.LocalPath);
		}

		public static async Task HandlePostAsync(HttpListenerRequest request, HttpListenerResponse response)
		{
			string text;
			using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
			{
				text = reader.ReadToEnd();
			}
			MyConsole.WriteData("	Received data", text);

			Dictionary<string, string> fields = new Dictionary<string, string>();
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
			DrawRequest drawRequest = new DrawRequest(fields);
			if (drawRequest.pixels.Count <= 0)
			{
				response.Send(422, "Unprocessable Entity", "The pixel drawing request is missing fields.");
				return;
			}
			string swishDomain = "https://mss.cpc.getswish.net";
			string swishPath = "/swish-cpcapi/api/v2/paymentrequests/";
			string swishUuid = Guid.NewGuid().ToString().Replace("-", "").ToUpper(); // Generates a UUID 32 characters, containing a mix of digits and capital A-F letters.

			// Creates a JSON response with all values in appsettings.json, as well as some new ones.
			Dictionary<string, string> contentFields = new Dictionary<string, string>(appsettings)
			{
				{ "currency", "SEK" },
				{ "amount", "1" },
				{ "message", "David testar!" }
			};

			// https://github.com/RickardPettersson/swish-api-csharp/issues/3
			// https://stackoverflow.com/a/61681840
			HttpClientHandler handler = new HttpClientHandler();
				
			foreach(X509Certificate2 certificate in certificates)
			{
				handler.ClientCertificates.Add(certificate);
			}
			handler.ClientCertificateOptions = ClientCertificateOption.Manual;
			handler.SslProtocols = System.Security.Authentication.SslProtocols.Tls12;

			HttpClient client = new HttpClient(handler);
			client.BaseAddress = new Uri(swishDomain);
			string contentString = JsonSerializer.Serialize(contentFields).ToString();
			StringContent content = new StringContent(contentString, Encoding.UTF8, "application/json");

			MyConsole.WriteData("	Sent data", contentString + " PUT " + swishDomain + swishPath + swishUuid);

			//try
			//{
			Task<HttpResponseMessage> swishConnection = client.PutAsync(swishPath + swishUuid, content);
			HttpResponseMessage swishResponse = await swishConnection;

			MyConsole.WriteTimestamp();
			Console.Write(" Swish response:");
			if (swishResponse.IsSuccessStatusCode)
			{
				Console.ForegroundColor = ConsoleColor.Green;
			}
			else
			{
				Console.ForegroundColor = ConsoleColor.Red;
			}
			MyConsole.WriteMany((int)swishResponse.StatusCode, swishResponse.StatusCode);
			if (swishResponse.IsSuccessStatusCode)
			{
				Console.ForegroundColor = ConsoleColor.Blue;
				Console.Write(" Client response:");
				response.Send(202, "Accepted", "Awaiting response from Swish servers.");
				return;
			}
					
			string responseString = await swishResponse.Content.ReadAsStringAsync();
			Console.WriteLine("Error: " + responseString);
			Dictionary<string, string>[]? responseJson = JsonSerializer.Deserialize<Dictionary<string, string>[]>(responseString);
			string responseHtml = "";
			if (responseJson != null)
			{
				foreach(Dictionary<string, string> error in responseJson)
				{
					responseHtml += "<fieldset>";
					foreach(KeyValuePair<string, string> row in error)
					{
						responseHtml += "<p><b>" + row.Key + ":</b> " + row.Value + "</p>";
					}
					responseHtml += "</fieldset>";
				}
			}

			// TODO: Test if this is correctly injected into HTML.
			response.Send(502, "Bad Gateway", "Received a error response from Swish servers.</p>" + responseHtml + "<p><b>Swish error code:</b> " + (int)swishResponse.StatusCode + " " + swishResponse.StatusCode.ToString());
			/*}
			catch (Exception exception)
			{
				Console.WriteLine(exception.ToString());
				response.Send(504, "Gateway Timeout", "Failed to get response from Swish servers.");
			}*/
		}

		public static string GetFullPath(string localPath)
		{
			if (localPath == "/")
			{
				return Path.Combine(currentDirectory, "website\\index.html");
			}
			else
			{
				return Path.Combine(currentDirectory, "website\\", localPath.Replace('/', '\\').TrimStart('\\'));
			}
		}

		public static void SendFile(this HttpListenerResponse response, string localPath) {
			string fullPath = GetFullPath(localPath);

			if (!File.Exists(fullPath))
			{
				response.Send(404, "Not Found", "The requested file '" + localPath + "' could not be found.");
				return;
			}

			response.ContentType = MimeTypes.GetMimeType(fullPath);
			response.AddHeader("Content-Disposition", "inline; filename = \"" + Path.GetFileName(fullPath) + "\"");
			
			if (!response.ContentType.EndsWith("html"))
			{
				response.ContentLength64 = new FileInfo(fullPath).Length;

				try
				{
					using (Stream fileStream = File.OpenRead(fullPath))
					{
						fileStream.CopyTo(response.OutputStream);
					}
				}
				catch (IOException)
				{
					response.Send(503, "Service Unavailable", "The server encountered a temporary error when reading '" + localPath + "'.");
					return;
				}
				response.Close();
			}
			else
			{
				SendHtml(response, localPath);
			}
			Console.ForegroundColor = ConsoleColor.Green; // TODO: Add alternative message if exception occurs in SendHtml.
			Console.Write(" 200 OK");
		}

		public static void SendHtml(this HttpListenerResponse response, string localPath, Dictionary<string, string>? parameters = null)
		{
			string fullPath = GetFullPath(localPath);

			ScriptObject script = new ScriptObject(); // Used for sending arguments to html template.
			if (parameters != null)
			{
				foreach (KeyValuePair<string, string> parameter in parameters)
				{
					script.Add(parameter.Key, parameter.Value);
				}
			}
			TemplateContext templateContext = new TemplateContext();
			templateContext.TemplateLoader = new MyTemplateLoader();
			templateContext.PushGlobal(script);

			Template template = Template.Parse(File.ReadAllText(fullPath, Encoding.UTF8));
			byte[] data = Encoding.UTF8.GetBytes(template.Render(templateContext));

			response.ContentLength64 = data.Length;
			response.OutputStream.Write(data);
			response.Close();

			Console.ForegroundColor = ConsoleColor.Green;
		}

		public static void Send(this HttpListenerResponse response, int code, string message, string? body = "")
		{
			if (code >= 100 && code < 400)
			{
				Console.ForegroundColor = ConsoleColor.Green;
			}
			else
			{
				Console.ForegroundColor = ConsoleColor.Red;
			}
			MyConsole.WriteMany(code, message);

			response.StatusCode = code;
			response.StatusDescription = message;
			Dictionary<string, string>? parameters = new Dictionary<string, string>()
			{
				{ "code", code.ToString() },
				{ "message", message }
			};
			if (body != null)
			{
				parameters.Add("body", body);
			}
			try
			{
				response.SendHtml("/error.html", parameters);
			}
			catch (Exception exception)
			{
				Console.WriteLine(" Exception during html generation:");
				Console.ForegroundColor = ConsoleColor.White;
				Console.Write(exception);
				response.SendBody("<html><body><h1>" + code.ToString() + ": " + message + "</h1><hr><p>" + body + "</p><h2>An additional Internal Server Error occurred</h2><p>" + exception + "</p></body></html>");
			}
		}

		public static void SendBody(this HttpListenerResponse response, string body)
		{
			response.SendBody(Encoding.UTF8.GetBytes(body));
		}
		public static void SendBody(this HttpListenerResponse response, byte[] bytes)
		{
			response.ContentLength64 = bytes.Length;
			response.ContentType = "text/html";

			response.OutputStream.Write(bytes);
			response.Close();
		}

		public static void SendRedirect(this HttpListenerResponse response, string location, int code, string message = "")
		{
			response.StatusCode = code;
			response.StatusDescription = message;
			response.RedirectLocation = location;
			response.Close();
		}

		public class MyTemplateLoader : ITemplateLoader
		{
			public string GetPath(TemplateContext context, SourceSpan callerSpan, string templateName) // TODO: Adapt for relative paths.
			{
				return Path.Combine(currentDirectory, "website\\", templateName.Replace('/', '\\').TrimStart('\\'));
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

	public static class Program
	{
		public static void Main()
		{
			// Certificate setup: https://stackoverflow.com/a/33905011
			HttpListener listener = new HttpListener();
			listener.Prefixes.Add("https://+:443/");
			listener.Start();
			listener.Listen();
		}

		public static void Listen(this HttpListener listener)
		{
			Console.ForegroundColor = ConsoleColor.White;
			Console.Write("Server running...");
			while (true)
			{
				
				HttpListenerContext context = listener.GetContext();
				//Task.Run(() => context.HandleConnection());
				context.HandleConnection();
			}
		}
	}
}