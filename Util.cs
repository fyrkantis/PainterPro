using System.Diagnostics;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Linq;

namespace PainterPro
{
	public static class Util
	{
		public const string swishDomain = "https://mss.cpc.getswish.net";
		public const string swishCreatePath = "/swish-cpcapi/api/v2/paymentrequests/";
		public const string swishQrPath = "/qrg-swish/api/v1/commerce/";
		public const string swishIp = "213.132.115.94:443";

		public static string currentDirectory = Directory.GetParent(Directory.GetCurrentDirectory()).Parent.Parent.FullName;
		public static Dictionary<string, object> appsettings = JsonSerializer.Deserialize<Dictionary<string, object>>(File.OpenRead(currentDirectory + "\\appsettings.json"));

		static X509Certificate2Collection certificates = new X509Certificate2Collection()
		{
			new X509Certificate2(currentDirectory + "\\certificates\\swish\\Swish_Merchant_TestCertificate_1234679304.p12", "swish"),
			new X509Certificate2(currentDirectory + "\\certificates\\swish\\Swish_Merchant_TestCertificate_1234679304.pem", "swish")
		};
		static HttpClientHandler swishCertificateHandler = new HttpClientHandler();

		static Util()
		{
			// https://github.com/RickardPettersson/swish-api-csharp/issues/3
			// https://stackoverflow.com/a/61681840
			foreach (X509Certificate2 certificate in certificates)
			{
				swishCertificateHandler.ClientCertificates.Add(certificate);
			}
			swishCertificateHandler.ClientCertificateOptions = ClientCertificateOption.Manual;
			swishCertificateHandler.SslProtocols = System.Security.Authentication.SslProtocols.Tls12;
		}

		public static HttpClient GetSwishClient(string domain = swishDomain)
		{
			HttpClient client = new HttpClient(swishCertificateHandler);
			client.BaseAddress = new Uri(domain);
			return client;
		}

		public static string GrammaticalListing(IEnumerable<object> collection)
		{
			int count = collection.Count();
			if (count >= 2)
			{
				return string.Join(", ", collection.Take(count - 1)) + " and " + collection.Last();
			}
			else if (count == 1)
			{
				string? firstString = collection.First().ToString();
				if (firstString == null)
				{
					return "";
				}
				return firstString;
			}
			return "";
		}

		/*public static object DoToTree<T>(this T tree, Func<object, object> action)
		{
			string? stringObject = tree as string;
			object[]? array = tree as object[];
			List<object>? list = tree as List<object>;
			Dictionary<object, object>? dictionary = tree as Dictionary<object, object>;
			KeyValuePair<object, object>? pair = tree as KeyValuePair<object, object>?;

			if (stringObject != null)
			{
				return action(tree);
			}
			else if (array != null) // Array
			{
				return ((List<object>)array.ToList().DoToTree(action)).ToArray();
				for (int i = 0; i < array.Length; i++)
				{
					array[i] = array[i].DoToTree(action);
				}
				return array;
			}
			else if (list != null)
			{
				for (int i = 0; i < list.Count; i++)
				{
					list[i] = list[i].DoToTree(action);
				}
				return list;
			}
			else if (dictionary != null)
			{
				foreach(KeyValuePair<object, object> row in dictionary)
				{
					KeyValuePair<object, object> newRow = new KeyValuePair<object, object>(row.Key.DoToTree(action), row.Value.DoToTree(action));
					dictionary.Remove(row.Key);
					dictionary.Add(newRow.Key, newRow.Value);
				}
				return dictionary;
			}
			else if (pair != null)
			{
				pair = new KeyValuePair<object, object>(pair.Value.Key.DoToTree(action), pair.Value.Value.DoToTree(action));
				return pair;
			}
			return action(tree);
		}*/
	}

	public static class MyConsole
	{
		public static ConsoleColor color
		{
			set
			{
#if DEBUG
				Console.ForegroundColor = value;
#endif
			}
		}

		public static void SetStatusColor(bool condition)
		{
			if (condition)
			{
				color = ConsoleColor.Green;
			}
			else
			{
				color = ConsoleColor.Red;
			}
		}

		public static void Write(object value)
		{
			Debug.Write(value);
#if DEBUG
			Console.Write(value);
#endif
		}

		public static void WriteLine(object value)
		{
			Write("\r\n");
			Write(value);
		}

		public static void WriteTimestamp()
		{
			color = ConsoleColor.White;
			WriteLine(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff"));
			color = ConsoleColor.Blue;
		}

		public static void WriteData(string name, object data)
		{
			color = ConsoleColor.White;
			WriteLine(name + ": ");
			color = ConsoleColor.Magenta;
			Write(data);
		}

		public static void WriteMany(params object?[] elements)
		{
			foreach (object? element in elements)
			{
				if (element != null)
				{
					Write(" " + element.ToString());
				}
			}
		}

		public static void WriteHttpStatus(HttpListenerContext context)
		{
			SetStatusColor(context.Response.StatusCode >= 100 && context.Response.StatusCode < 400);
			WriteMany(context.Response.StatusCode, context.Response.StatusDescription);
			if (context.Response.RedirectLocation != null)
			{
				color = ConsoleColor.Magenta;
				WriteMany("->", context.Response.RedirectLocation);
			}
		}
	}
}